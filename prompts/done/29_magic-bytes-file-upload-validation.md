# Feature: Magic Bytes Validation for File Uploads

> **GitHub Issue:** [#88 — Unrestricted file upload — magic bytes not validated against claimed extension](https://github.com/SensibleProgramming/TournamentOrganizer/issues/88)
> **Story Points:** 3 · Model: `sonnet`

## Context
All four image-upload endpoints (UploadAvatar, EventsController.UploadBackground, StoresController.UploadLogo, StoresController.UploadBackground) check file extension against an allowlist but never inspect actual file content. An attacker can rename a web shell `shell.jpg` and it will be written to disk. This fix adds magic bytes validation — reading the first 12 bytes of the stream and checking them against known image signatures — before any file is written to disk.

---

## Dependencies

- None

---

## Files Modified

**Created:**
- `src/TournamentOrganizer.Api/Helpers/ImageMagicBytesValidator.cs`
- `src/TournamentOrganizer.Tests/Helpers/ImageMagicBytesValidatorTests.cs`

**Modified:**
- `src/TournamentOrganizer.Api/Controllers/PlayersController.cs`
- `src/TournamentOrganizer.Api/Controllers/EventsController.cs`
- `src/TournamentOrganizer.Api/Controllers/StoresController.cs`

---

## Requirements

- Every upload endpoint must validate magic bytes before writing the file to disk.
- A file whose magic bytes do not match a known image format must be rejected with `400 Bad Request` and message `"File content does not match an allowed image type."` regardless of its extension.
- Supported formats and their signatures:
  - **JPEG**: bytes[0] = `0xFF`, bytes[1] = `0xD8`
  - **PNG**: bytes[0] = `0x89`, bytes[1] = `0x50` (`'P'`)
  - **GIF**: bytes[0] = `0x47`, bytes[1] = `0x49` (`'G'`, `'I'`)
  - **WebP**: bytes[0..3] = `52 49 46 46` ("RIFF") AND bytes[8..11] = `57 45 42 50` ("WEBP") — needs 12-byte buffer
- After reading the magic bytes, the stream must be reset to position 0 before `CopyToAsync` is called, so the full file is still written.
- The validator is a static helper (not a service) — no DI registration needed.
- The check is applied in all four upload methods:
  - `PlayersController.UploadAvatar` (allows JPEG, PNG, GIF, WebP)
  - `EventsController.UploadBackground` (allows JPEG, PNG)
  - `StoresController.UploadLogo` (allows JPEG, PNG, GIF)
  - `StoresController.UploadBackground` (allows JPEG, PNG)

---

## Backend (`src/TournamentOrganizer.Api/`)

### Helper (`Helpers/`)

**`ImageMagicBytesValidator.cs`** — new static class in `TournamentOrganizer.Api.Helpers` namespace:

```csharp
public static class ImageMagicBytesValidator
{
    // Reads up to 12 bytes, checks signatures, resets stream to 0.
    public static async Task<bool> IsValidImageAsync(IFormFile file)
}
```

- Allocate a `byte[12]` buffer.
- Open the stream with `file.OpenReadStream()`.
- `await stream.ReadAsync(buffer, 0, 12)` — fewer bytes are fine for small files.
- Reset with `stream.Seek(0, SeekOrigin.Begin)` so the full content is still available for `CopyToAsync`.
- Return `true` if any known signature matches; `false` otherwise.
- Check JPEG (2 bytes), PNG (2 bytes), GIF (2 bytes), WebP (bytes 0–3 and 8–11, only if buffer length ≥ 12).

### Controllers

Insert magic byte check **after** extension and size validation, **before** the `FileStream` write. Pattern for each endpoint:

```csharp
if (!await ImageMagicBytesValidator.IsValidImageAsync(<file>))
    return BadRequest("File content does not match an allowed image type.");
```

Apply to all four upload methods:
- `PlayersController.UploadAvatar`
- `EventsController.UploadBackground`
- `StoresController.UploadLogo`
- `StoresController.UploadBackground`

---

## Backend Unit Tests (`src/TournamentOrganizer.Tests/`)

**Test class: `ImageMagicBytesValidatorTests`** in `src/TournamentOrganizer.Tests/Helpers/`

Use a helper `MakeFormFile(byte[] content)` that creates a mock `IFormFile` backed by a `MemoryStream`.

Tests:
- `IsValidImageAsync_ReturnsFalse_ForEmptyFile`
- `IsValidImageAsync_ReturnsFalse_ForPlainTextContent`
- `IsValidImageAsync_ReturnsFalse_ForZeroBytes`
- `IsValidImageAsync_ReturnsTrue_ForJpegMagicBytes` — buffer starts with `FF D8`
- `IsValidImageAsync_ReturnsTrue_ForPngMagicBytes` — buffer starts with `89 50`
- `IsValidImageAsync_ReturnsTrue_ForGifMagicBytes` — buffer starts with `47 49`
- `IsValidImageAsync_ReturnsTrue_ForWebpMagicBytes` — 12-byte buffer with `RIFF` + 4 arbitrary + `WEBP`
- `IsValidImageAsync_ResetsStreamAfterRead` — after calling the validator the stream's `Position` is 0 and full content is still readable

Run with: `dotnet test --filter "FullyQualifiedName~ImageMagicBytesValidatorTests"`

---

## Verification Checklist

- [ ] `/build` — 0 errors on .NET
- [ ] `dotnet test --filter "FullyQualifiedName~ImageMagicBytesValidatorTests"` — all pass
- [ ] `dotnet test` — full suite passes (no regressions)
