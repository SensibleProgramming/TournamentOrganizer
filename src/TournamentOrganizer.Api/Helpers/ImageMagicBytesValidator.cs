using Microsoft.AspNetCore.Http;

namespace TournamentOrganizer.Api.Helpers;

public static class ImageMagicBytesValidator
{
    /// <summary>
    /// Reads the first 12 bytes of the uploaded file, checks them against known
    /// image magic byte signatures, then resets the stream to position 0 so the
    /// full file is still available for CopyToAsync.
    /// </summary>
    public static async Task<bool> IsValidImageAsync(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return false;

        var buffer = new byte[12];
        await using var stream = file.OpenReadStream();
        var bytesRead = await stream.ReadAsync(buffer, 0, 12);

        if (bytesRead < 2)
            return false;

        // JPEG: FF D8
        if (buffer[0] == 0xFF && buffer[1] == 0xD8)
            return true;

        // PNG: 89 50 (89 PNG)
        if (buffer[0] == 0x89 && buffer[1] == 0x50)
            return true;

        // GIF: 47 49 (GI...)
        if (buffer[0] == 0x47 && buffer[1] == 0x49)
            return true;

        // WebP: RIFF????WEBP (needs 12 bytes)
        if (bytesRead >= 12
            && buffer[0] == 0x52 && buffer[1] == 0x49 && buffer[2] == 0x46 && buffer[3] == 0x46
            && buffer[8] == 0x57 && buffer[9] == 0x45 && buffer[10] == 0x42 && buffer[11] == 0x50)
            return true;

        return false;
    }
}
