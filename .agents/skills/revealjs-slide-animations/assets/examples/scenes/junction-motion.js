document.addEventListener("DOMContentLoaded", () => {
  const graph = document.querySelector("#editable-junction-plot");
  const region = graph.querySelector("[data-region]");
  const field = graph.querySelector("[data-field]");
  const draw = (halfWidth) => {
    region.setAttribute("x", 320 - halfWidth);
    region.setAttribute("width", halfWidth * 2);
    field.setAttribute("d", `M ${320 - halfWidth} 212 L 320 ${212 - halfWidth * 0.9} L ${320 + halfWidth} 212`);
    graph.dataset.width = 2 * halfWidth;
  };
  const bind = () => SlideAnimations.bindState(graph, {
    initial: 40,
    steps: [{beat: "raise-bias", state: 82}, {beat: "return-bias", state: 40}],
    duration: 420,
    printFinal: true,
    render: draw
  });
  if (Reveal.isReady()) bind();
  else Reveal.on("ready", bind);
});
