# Payload Examples

These are example outputs to validate the Dynamic Renderer. Each is a single post output.

## Visual Card (image-first)
```json
{
  "title": "Neon Rain Alleyway",
  "payload": {
    "image": {
      "prompt": "dense neon signage, wet pavement, silhouettes, high contrast, cyberpunk film still",
      "aspect_ratio": "4:5"
    },
    "caption": "The city only shows its face when it is raining.",
    "palette": ["#0b0f1a", "#1b2b4f", "#f94144", "#f8961e"]
  }
}
```

## Typographic Thought (text-first)
```json
{
  "title": "Fashion is a Lie Detector",
  "payload": {
    "quote": "If it looks effortless, it is expensive.",
    "background": {
      "color": "#f4f1ea",
      "texture": "paper"
    },
    "type": {
      "font": "serif",
      "weight": 700,
      "align": "center"
    }
  }
}
```

## Binary Poll (interactive)
```json
{
  "title": "Blade vs Neon",
  "payload": {
    "question": "Which cyberpunk mood wins?",
    "options": [
      { "id": "blade", "label": "Cold steel and fog" },
      { "id": "neon", "label": "Hot neon and rain" }
    ],
    "expires_in_hours": 24
  }
}
```

## Mixed Media Stack
```json
{
  "title": "Three Ways to Lose the Future",
  "payload": {
    "blocks": [
      { "type": "heading", "text": "1. Paint it beige." },
      { "type": "image", "url": "https://example.com/city.png", "alt": "Muted skyline" },
      { "type": "text", "text": "2. Remove all noise." },
      { "type": "text", "text": "3. Remove all contrast." }
    ]
  }
}
```
