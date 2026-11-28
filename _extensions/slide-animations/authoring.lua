-- Expand slide-local Markdown into the existing CSS and named-beat API.
local recipes = {
  ["sa-exhibits"] = true, ["sa-walkthrough"] = true, ["sa-quiz"] = true,
  ["sa-mermaid-steps"] = true, ["sa-placement"] = true, ["sa-cues"] = true
}

local function has(block, class)
  return block.classes and block.classes:includes(class)
end

local function fail(slide, message)
  -- Some Quarto versions replace the Lua error function with a logger.
  assert(false, "Slide Animations [" .. slide.identifier .. "]: " .. message)
end

local function config(kind, options)
  -- JSON in an HTML script needs to escape < even inside string literals.
  local json = pandoc.json.encode(options):gsub("<", "\\u003c")
  return pandoc.RawBlock("html", '<script type="application/json" data-sa-' ..
    kind .. '>' .. json .. '</script>')
end

local function heading(section)
  local title = section.title
  for _, class in ipairs({"sa-source", "sa-command", "sa-result", "sa-destination", "sa-filetree"}) do
    title.classes = title.classes:filter(function(value) return value ~= class end)
  end
  title.attributes["sa-cue"] = nil
  title.attributes["sa-callout"] = nil
  return title
end

local function panel(classes, content, attrs)
  return pandoc.Div(content, pandoc.Attr("", classes, attrs))
end

local function mark(block, name)
  block.attributes["data-sa-beat"] = name
  return block
end

local function split_sections(slide, body)
  local intro, sections, current = pandoc.List(), {}
  for _, block in ipairs(body) do
    if block.t == "Header" and block.level == slide.level + 1 then
      current = {title = block, body = pandoc.List(), cue = block.attributes["sa-cue"]}
      sections[#sections + 1] = current
    elseif current then
      current.body:insert(block)
    else
      intro:insert(block)
    end
  end
  if #sections == 0 then fail(slide, "expected at least one subsection heading") end
  return intro, sections
end

local function scene_context(slide)
  local beats, used = pandoc.List(), {}
  local function beat(name)
    name = name or ("step-" .. (#beats + 1))
    if not name:match("^[a-z][a-z0-9%-]*$") then fail(slide, "invalid cue '" .. name .. "'") end
    if used[name] then fail(slide, "duplicate cue '" .. name .. "'") end
    used[name] = true
    beats:insert(name)
    return name
  end
  return beats, beat, used
end

local function is_callout(block)
  return block.t == "Div" and (block.attributes["__quarto_custom_type"] == "Callout" or
    block.classes:find_if(function(c) return c:match("^callout%-") end) ~= nil)
end

local function takeaway(sections)
  local body = sections[#sections].body
  if #body > 0 and is_callout(body[#body]) and
    sections[#sections].title.attributes["sa-callout"] ~= "with-step" then
    return body:remove(#body)
  end
end

-- Recognize a list of code-formatted paths, with optional nested directory lists.
-- Keep the Pandoc list and inline spans so links, accessibility and Auto-Animate
-- identities continue to come from the Markdown.
local function file_tree(list)
  if list.t ~= "BulletList" or #list.content == 0 then return end
  local rows = pandoc.List()
  for _, item in ipairs(list.content) do
    local label, children = item[1], item[2]
    if not label or (label.t ~= "Plain" and label.t ~= "Para") or
       #label.content ~= 1 or #item > 2 then return end
    local original = label.content[1]
    local name = original.t == "Span" and #original.content == 1 and original.content[1] or original
    if name.t ~= "Code" then return end
    local directory = name.text:match("[/\\]$")
    if not directory and not name.text:find("[./\\]") then return end
    local subtree = children and directory and file_tree(children)
    if children and not subtree then return end
    local filename = pandoc.Code(name.text, name.attr)
    filename.classes:insert("sa-filename")
    local entry = original.t == "Span" and pandoc.Span({filename}, original.attr) or filename
    local row = panel({"sa-filetree-entry", directory and "sa-directory" or "sa-file"},
      {pandoc.Plain({entry})})
    rows:insert(subtree and {row, subtree} or {row})
  end
  return pandoc.BulletList(rows)
end

local function section_panel(section, classes, detect_files)
  local identity = section.title.attributes["sa-object"]
  local show_tree = detect_files or has(section.title, "sa-filetree")
  section.title.attributes["sa-object"] = nil
  local blocks = pandoc.List({heading(section)})
  for _, block in ipairs(section.body) do
    local tree = show_tree and file_tree(block)
    blocks:insert(tree and panel({"sa-filetree"}, {tree}) or block)
  end
  return panel(classes, blocks, identity and {["sa-object"] = identity})
end

local function exhibits(slide, body, beat)
  local intro, sections = split_sections(slide, body)
  local closing = takeaway(sections)
  local cards = pandoc.List()
  for _, section in ipairs(sections) do
    cards:insert(mark(section_panel(section, {"sa-panel", "sa-exhibit", "fragment", "custom"}), beat(section.cue)))
  end
  intro:insert(panel({"sa-grid"}, cards))
  if closing then intro:insert(mark(panel({"sa-takeaway"}, {closing}), beat())) end
  return intro
end

local function walkthrough(slide, body, beat)
  local intro, sections = split_sections(slide, body)
  local closing = takeaway(sections)
  local source, stages = nil, pandoc.List()
  local layout = slide.attributes["sa-layout"] or "replace"
  if layout ~= "replace" and layout ~= "accumulate" then
    fail(slide, "sa-layout must be replace or accumulate")
  end
  for i, section in ipairs(sections) do
    local first = i == 1
    local is_source = has(section.title, "sa-source")
    if is_source and not first then fail(slide, "the source must be the first subsection") end
    if first and section.cue then fail(slide, "the opening state has no click cue") end
    local classes = {has(section.title, "sa-command") and "sa-terminal" or "sa-panel"}
    if has(section.title, "sa-result") then classes[#classes + 1] = "sa-walkthrough-result" end
    local card = section_panel(section, classes, is_source)
    if is_source then
      source = card
    else
      card.classes:insert("sa-walkthrough-stage")
      if first then card.classes:insert("sa-opening")
      else mark(card, beat(section.cue)) end
      stages:insert(card)
    end
  end
  if #stages > 0 then
    local lane = panel({"sa-walkthrough-stages", "sa-layout-" .. layout}, stages)
    intro:insert(source and panel({"sa-grid", "sa-walkthrough-columns"}, {source, lane}) or lane)
  elseif source then
    intro:insert(source)
  end
  if closing then intro:insert(mark(panel({"sa-takeaway"}, {closing}), beat())) end
  return intro
end

local function quiz(slide, body, beat)
  local intro, sections = split_sections(slide, body)
  local cards = pandoc.List()
  for i, section in ipairs(sections) do
    if #section.body == 0 then fail(slide, "each quiz question needs an answer") end
    local cue = section.cue
    if i == 1 and cue then fail(slide, "the first quiz question is the opening state") end
    local question = i > 1 and beat(cue)
    local answer = mark(panel({"sa-quiz-answer"}, section.body), beat(cue and cue .. "-answer"))
    local card = panel({"sa-panel"}, {heading(section), answer})
    if question then mark(card, question) end
    cards:insert(card)
  end
  intro:insert(panel({"sa-grid", "sa-quiz-cards"}, cards))
  return intro
end

local function mermaid_steps(slide, body, beat)
  local figure = pandoc.List()
  local list
  for _, block in ipairs(body) do
    if list then fail(slide, "put the ordered explanations last") end
    if block.t == "OrderedList" then list = block
    else figure:insert(block) end
  end
  if #figure == 0 or not list or #list.content == 0 then
    fail(slide, "expected a Mermaid diagram followed by an ordered list")
  end
  local mode = slide.attributes["sa-mode"] or "progressive"
  if mode ~= "progressive" and mode ~= "focus" then fail(slide, "sa-mode must be progressive or focus") end
  local options = {nodes = {}, edges = {}, labels = {}, connections = pandoc.List(), steps = pandoc.List()}
  local known, shown, shown_set, notes, previous = {}, pandoc.List(), {}, pandoc.List(), nil
  local function show(target)
    if not shown_set[target] then
      shown:insert(target)
      shown_set[target] = true
    end
  end
  for i, item in ipairs(list.content) do
    local prefix = item[1] and (item[1].t == "Para" or item[1].t == "Plain") and item[1].content[1]
    local attrs = prefix and prefix.t == "Span" and prefix.attributes
    local node = attrs and attrs["sa-node"]
    if not node or node == "" then fail(slide, "explanation " .. i .. " needs a leading [text]{sa-node=\"ID\"} span") end
    local from = attrs["sa-from"] or previous
    if attrs["sa-from"] and not known[from] then fail(slide, "sa-from must identify an earlier explanation node") end
    if not known[node] then
      known[node] = "node " .. node .. " (explanation " .. i .. ")"
      options.nodes[known[node]] = node
    end
    local focus = pandoc.List({known[node]})
    local edge, label = attrs["sa-edge"], attrs["sa-edge-label"]
    if edge or label then
      if edge then
        local key = "edge " .. edge
        options.edges[key] = edge
        focus:insert(key)
      end
      if label then
        local key = "label " .. label
        options.labels[key] = label
        focus:insert(key)
      end
    elseif from and from ~= node then
      local pair = "connection " .. from .. " to " .. node
      options.connections:insert({key = pair, from = from, to = node})
      focus:insert(pair)
      focus:insert(pair .. " label")
    end
    for _, target in ipairs(focus) do show(target) end
    local state = {focus = focus}
    if mode == "progressive" then
      state.show = pandoc.List()
      state.show:extend(shown)
    end
    local note = panel({"sa-current-note"}, item)
    if i == 1 then
      if attrs["sa-cue"] then fail(slide, "the first explanation is the opening state") end
      options.initial = state
      note.classes:insert("sa-initial-note")
    else
      local name = beat(attrs["sa-cue"])
      options.steps:insert({beat = name, state = state})
      mark(note, name)
    end
    for _, attr in ipairs({"sa-node", "sa-from", "sa-edge", "sa-edge-label", "sa-cue"}) do attrs[attr] = nil end
    item[1].content[1] = prefix
    if item[1].t == "Plain" then note.content[1] = pandoc.Para(item[1].content) end
    notes:insert(note)
    previous = node
  end
  -- Empty maps are optional and can be dropped before JSON encoding.
  for _, map in ipairs({"edges", "labels"}) do
    if next(options[map]) == nil then options[map] = nil end
  end
  figure:insert(config("mermaid", options))
  local classes = {"sa-mermaid-" .. mode}
  return pandoc.List({
    pandoc.Div(figure, pandoc.Attr(slide.identifier .. "-diagram", classes)),
    panel({"sa-note-slot"}, notes)
  })
end

local function placement(slide, body)
  local intro, sections = split_sections(slide, body)
  local columns, destination = pandoc.List(), false
  slide.attributes["auto-animate"] = "true"
  slide.attributes["auto-animate-unmatched"] = "false"
  for _, section in ipairs(sections) do
    local is_destination = has(section.title, "sa-destination")
    if is_destination and destination then fail(slide, "expected one destination") end
    destination = destination or is_destination
    local card = section_panel(section, {"sa-panel"}, is_destination)
    if is_destination then
      local identity = slide.attributes["sa-destination"] or "destination"
      card.classes:insert("sa-dropzone")
      card.attributes["data-id"] = identity
      card.attributes["data-sa-qa-fixed"] = identity
    end
    columns:insert(card)
  end
  if not destination or #columns ~= 2 then fail(slide, "expected two subsections, one marked .sa-destination") end
  intro:insert(panel({"sa-grid", "sa-placement-grid"}, columns))
  return intro
end

local function cues(slide, body, beat)
  local intro, sections = split_sections(slide, body)
  for _, section in ipairs(sections) do
    if not section.cue then fail(slide, "custom motion subsections need sa-cue") end
    intro:insert(mark(section_panel(section, {"sa-cue-note"}), beat(section.cue)))
  end
  return intro
end

local builders = {
  ["sa-exhibits"] = exhibits, ["sa-walkthrough"] = walkthrough, ["sa-quiz"] = quiz,
  ["sa-mermaid-steps"] = mermaid_steps, ["sa-placement"] = placement, ["sa-cues"] = cues
}

local function structural(block)
  return block.t == "Div" and (has(block, "quarto-auto-generated-content") or
    (has(block, "hidden") and #block.content == 0))
end

-- Allow a command to wrap between words without breaking flags, paths or names.
local function inline_code(inline)
  if not inline.text:find("%S%s+%S") or inline.identifier ~= "" or
     #inline.classes > 0 or #inline.attributes > 0 then return inline end
  local tokens, previous = pandoc.List(), 1
  for start, word, after in inline.text:gmatch("()(%S+)()") do
    if start > previous then tokens:insert(pandoc.Str(inline.text:sub(previous, start - 1))) end
    tokens:insert(pandoc.Code(word))
    previous = after
  end
  if previous <= #inline.text then tokens:insert(pandoc.Str(inline.text:sub(previous))) end
  return pandoc.Span(tokens, pandoc.Attr("", {"sa-code-phrase"}))
end

local function scene(slide, body, recipe)
  local visible, notes = pandoc.List(), pandoc.List()
  for _, block in ipairs(body) do
    if has(block, "notes") or structural(block) then notes:insert(block)
    else visible:insert(block) end
  end
  local beats, beat, used = scene_context(slide)
  local content = builders[recipe](slide, visible, beat)
  local object_ids = {}
  local function decorate(object)
    local id = object.attributes["sa-object"]
    if id then
      if id == "" or object_ids[id] then fail(slide, "empty or duplicate object identity '" .. id .. "'") end
      object_ids[id] = true
      object.attributes["data-id"] = id
      object.attributes["sa-object"] = nil
      if object.t == "Span" then object.classes:insert("sa-chip") end
    end
    if object.attributes["sa-cue"] then fail(slide, "place sa-cue on a recipe heading or Mermaid explanation") end
    if has(object, "fragment") and not used[object.attributes["data-sa-beat"]] then
      fail(slide, "a recipe owns fragment timing on its slide")
    end
    return object
  end
  local result = panel({"sa-scene", "sa-author-scene", recipe .. "-scene", "nonincremental"}, content):walk({
    Span = decorate, Div = decorate,
    Code = inline_code,
    -- Pandoc can turn a headed Div into a section, which Reveal counts as
    -- another slide. Keep the original anchor and accessible heading level.
    Header = function(block)
      block.classes:insert("sa-panel-title")
      block.attributes.role = "heading"
      block.attributes["aria-level"] = tostring(block.level)
      return decorate(pandoc.Div({pandoc.Para(block.content)}, block.attr))
    end,
    RawBlock = function(block)
      if block.text:find("<script[^>]*data%-sa%-beats") then
        fail(slide, "a recipe owns the slide's beat configuration")
      end
    end
  })
  if #beats > 0 then result.content:insert(config("beats", {beats = beats})) end
  notes:insert(1, result)
  return notes
end

function Pandoc(doc)
  if FORMAT ~= "revealjs" then return end
  local level = (PANDOC_WRITER_OPTIONS and PANDOC_WRITER_OPTIONS.slide_level) or 2
  local output = pandoc.List()
  local i = 1
  while i <= #doc.blocks do
    local block = doc.blocks[i]
    local recipe
    if block.t == "Header" then
      for _, class in ipairs(block.classes) do
        if recipes[class] then
          if recipe then fail(block, "choose one recipe class per slide") end
          recipe = class
        end
      end
    end
    i = i + 1
    if recipe then
      if block.level ~= level then fail(block, "recipe heading must match slide-level " .. level) end
      local body = pandoc.List()
      while i <= #doc.blocks do
        local child = doc.blocks[i]
        if (child.t == "Header" and child.level <= level) or child.t == "HorizontalRule" or structural(child) then break end
        body:insert(child)
        i = i + 1
      end
      local content = scene(block, body, recipe)
      output:insert(block)
      output:extend(content)
    else
      output:insert(block)
    end
  end
  doc.blocks = output
  return doc
end
