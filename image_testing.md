# Image Integration Testing Playbook

## Image Handling Rules

### Always use base64-encoded images for all tests and requests
- Accepted formats: JPEG, PNG, WEBP only
- Do not use SVG, BMP, HEIC, or other formats
- Do not upload blank, solid-color, or uniform-variance images
- Every image must contain real visual features — such as objects, edges, textures, or shadows

### Image Validation
- If the image is not PNG/JPEG/WEBP, transcode it to PNG or JPEG before upload
- Always re-detect and update the MIME after transformations
- If the image is animated (e.g., GIF, APNG, WEBP animation), extract the first frame only
- Resize large images to reasonable bounds (avoid oversized payloads)

## Testing Examples

### Convert image to base64
```python
import base64

with open('/path/to/receipt.jpg', 'rb') as image_file:
    base64_image = base64.b64encode(image_file.read()).decode('utf-8')
```

### Test image analysis endpoint
```bash
curl -X POST "https://your-app.com/api/chat/analyze-image" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "image_base64": "BASE64_STRING_HERE",
    "prompt": "Extract financial information from this receipt"
  }'
```

## Validation Checklist
- [ ] Image is in JPEG, PNG, or WEBP format
- [ ] Image contains visible features (not blank)
- [ ] Base64 encoding is correct
- [ ] MIME type matches actual image format
- [ ] Response contains extracted financial data
