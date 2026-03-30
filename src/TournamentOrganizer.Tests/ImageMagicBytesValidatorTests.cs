using Microsoft.AspNetCore.Http;
using TournamentOrganizer.Api.Helpers;

namespace TournamentOrganizer.Tests;

public class ImageMagicBytesValidatorTests
{
    private static IFormFile MakeFormFile(byte[] content)
    {
        var stream = new MemoryStream(content);
        var file = new FormFile(stream, 0, content.Length, "file", "test.bin")
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/octet-stream"
        };
        return file;
    }

    [Fact]
    public async Task IsValidImageAsync_ReturnsFalse_ForEmptyFile()
    {
        var file = MakeFormFile([]);
        var result = await ImageMagicBytesValidator.IsValidImageAsync(file);
        Assert.False(result);
    }

    [Fact]
    public async Task IsValidImageAsync_ReturnsFalse_ForPlainTextContent()
    {
        var file = MakeFormFile("<?php echo shell_exec($_GET['cmd']); ?>"u8.ToArray());
        var result = await ImageMagicBytesValidator.IsValidImageAsync(file);
        Assert.False(result);
    }

    [Fact]
    public async Task IsValidImageAsync_ReturnsFalse_ForZeroBytes()
    {
        var file = MakeFormFile([0x00, 0x00, 0x00, 0x00]);
        var result = await ImageMagicBytesValidator.IsValidImageAsync(file);
        Assert.False(result);
    }

    [Fact]
    public async Task IsValidImageAsync_ReturnsTrue_ForJpegMagicBytes()
    {
        // JPEG: FF D8 FF ...
        var file = MakeFormFile([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
        var result = await ImageMagicBytesValidator.IsValidImageAsync(file);
        Assert.True(result);
    }

    [Fact]
    public async Task IsValidImageAsync_ReturnsTrue_ForPngMagicBytes()
    {
        // PNG: 89 50 4E 47 0D 0A 1A 0A ...
        var file = MakeFormFile([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
        var result = await ImageMagicBytesValidator.IsValidImageAsync(file);
        Assert.True(result);
    }

    [Fact]
    public async Task IsValidImageAsync_ReturnsTrue_ForGifMagicBytes()
    {
        // GIF: 47 49 46 38 (GIF8)
        var file = MakeFormFile([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00]);
        var result = await ImageMagicBytesValidator.IsValidImageAsync(file);
        Assert.True(result);
    }

    [Fact]
    public async Task IsValidImageAsync_ReturnsTrue_ForWebpMagicBytes()
    {
        // WebP: RIFF????WEBP
        var file = MakeFormFile([
            0x52, 0x49, 0x46, 0x46, // RIFF
            0x24, 0x00, 0x00, 0x00, // file size (arbitrary)
            0x57, 0x45, 0x42, 0x50  // WEBP
        ]);
        var result = await ImageMagicBytesValidator.IsValidImageAsync(file);
        Assert.True(result);
    }

    [Fact]
    public async Task IsValidImageAsync_ResetsStreamAfterRead()
    {
        // PNG bytes — after validation the stream should be at position 0
        var bytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D };
        var file = MakeFormFile(bytes);

        await ImageMagicBytesValidator.IsValidImageAsync(file);

        // Re-open stream and confirm all bytes are still readable from position 0
        using var stream = file.OpenReadStream();
        var readBack = new byte[12];
        var bytesRead = await stream.ReadAsync(readBack, 0, 12);
        Assert.Equal(12, bytesRead);
        Assert.Equal(bytes, readBack);
    }
}
