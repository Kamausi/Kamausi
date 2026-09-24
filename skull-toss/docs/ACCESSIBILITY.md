# Accessibility

Skull Toss keeps its 1933 look, but the UI underneath works like a modern game. Everything here is in **Settings**.

| Need | Setting or behaviour |
|---|---|
| Motion sensitivity | **Camera:** Full, Gentle or Still. **Camera jolts** on or off. **Film look:** Full, Light or Off. A device that asks for reduced motion starts on Still and Light, with the iris transitions skipped. |
| Photosensitivity | **Flashes:** Full, Reduced or Off. Reduced swaps every screen flash for one soft 10% flash and dims lightning and the film's flicker to 30%. Off removes all three. Reduced motion starts on Reduced. |
| Low vision | **High contrast** draws an inked pale-yellow halo round the ring and Morty and brightens dim text and lines. **Text size:** Large zooms menus, sheets and the HUD by 15%. |
| Hearing | Every sound has a visual: result words (PERFECT!, BONK), boss tells, captions such as CAW! and PTOO!, and the combo meter. Music, effects and ambience have separate volumes. |
| Colour vision | No gameplay depends on colour. Results are words, power-ups are distinct shapes, and boss health is a bar with a number. |
| Screen readers | A live region announces every throw's result, the score and the skulls left, plus each stage card. Sheets are `role="dialog"` with `aria-modal`, and the switches and radio rows carry their roles and states. |
| Keyboard | Arrows aim and Space throws. Esc or P pauses, and Esc closes sheets. Tab stays inside an open sheet, and the arrow keys move along radio rows. |
| Gamepad | The stick aims like a finger drag, A or RT throws, Start pauses. |
| Haptics | Vibration on or off. |

The spec checks the flash levels, contrast and text size, the focus trap and the radio rows.
