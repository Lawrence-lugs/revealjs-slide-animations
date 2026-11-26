---
name: revealjs-slide-animations
description: Improve existing or new Reveal.js and Quarto lecture slides with meaningful, presenter-controlled animation. Identify what should move, choose explanatory devices, implement with native fragments, Auto-Animate, SlideAnimations CSS/JS or Magic Move, then test visually and through forward/backward navigation.
---

# Animated technical slides

Adapted from the remotion-animated-explainers skill in Lawrence-lugs/remotion-project-template. The motion should carry an explanation, not decorate it. Static slides are valid. The lecturer owns the pace.

## Read first
Read references/motion-purpose.md (shared attention theory, with video-specific timing rules superseded below), references/animation-devices.md, and references/step-sheet.md. Consult docs/usage-guide.qmd for actual API, docs/examples.qmd for working examples.

## Decision process
1. Read the entire deck and verify claims, equations and units. Preserve theme, source figures and structure unless necessary. Identify ideas that change, travel, accumulate, break or need ordered attention.
2. For each candidate, state what motion contributes: explanation, orientation, sequence, signal, state, continuity or quiet flow. Leave reference material, definitions and recaps static when appropriate.
3. Assign tiers: focal (one explanatory motion per step), reading targets (still while read), ambient (quiet, peripheral, meaningful). Never bob, breathe, drift, loop a glow on cards or text.
4. Write initial state and explicit presenter steps, including destination and reverse behavior. No automatic advances or fixed reading durations. Question, discussion, answer are separate clicks.
5. Prefer native fragments and Auto-Animate; use supplied sa-* CSS utilities next; use Magic Move for compatible existing SVG/math/code; use generalized JS bindState or tween only when numerical drivers or custom geometry are needed. No new graphing or diagram framework.
6. Derive every dependent label, status and color from the same driver. Keep IDs stable. Do not assume arbitrary SVG geometry or semantic topology morphs are supported.
7. Render and serve the deck. Test initial and every settled fragment, backward navigation, direct jumps, rapid clicks, slide exit and reentry, print/reduced motion, and inspect intermediate states visually. Test both normal and supplied theme where possible. Do not use animation density as a target.
8. Report changed slides, why motion is useful, test evidence and known failures. Never claim visual QA if screenshots were not reviewed.

## Slide-specific overrides
No frame numbers, scene lengths, 40% motion rule, timed pauses, mandatory final hold or last-frame-as-failure rule. Replace last-frame test with before/after test: does the transition expose a relationship or guide attention? Static stretches are intentional. Passive CSS flow is acceptable only when it passes ambient tests and stops off-slide. Complex continuous choreography belongs in embedded video.

## Style
Inherit font, color, sizing and layout from existing theme. Scope new classes. Use --sa-* tokens for deliberate overrides; never globally restyle headings or columns. Use native slide controls, not custom navigation.
