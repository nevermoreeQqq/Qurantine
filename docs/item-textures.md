# Item textures

All 25 non-weapon item visuals now use restrained field materials and recognizable silhouettes: five ammunition types, fuel, grenades, shuriken, armor, medical supplies, flashlight, night vision, building materials, three turrets, currency and mines.

Shop previews and world pickups share the same artwork. Static pickup and grenade bodies are cached on high-resolution canvases; movement, fading and lighting remain separate. Turrets and placed barriers gain panel, fastener and material details. Grenade and construction wheel previews fit their existing slots.

This change preserves item prices, ammunition quantities, damage, collision shapes, networking and launcher behavior.

Validation: comparison gallery checks all 25 shop previews for clipping, checks cache reuse and canvas alpha restoration; game shop inspection, Node test suite and native macOS Electron smoke launch.
