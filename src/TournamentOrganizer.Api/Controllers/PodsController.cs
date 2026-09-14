using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TournamentOrganizer.Api.DTOs;
using TournamentOrganizer.Api.Services.Interfaces;

namespace TournamentOrganizer.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PodsController : ControllerBase
{
    private readonly IEventService _eventService;
    private readonly ILogger<PodsController> _logger;

    public PodsController(IEventService eventService, ILogger<PodsController> logger)
    {
        _eventService = eventService;
        _logger = logger;
    }

    [HttpPost("move-player")]
    [Authorize(Policy = "StoreEmployee")]
    public async Task<IActionResult> MovePlayer(MovePlayerRequestDto dto)
    {
        try
        {
            var result = await _eventService.MovePlayerAsync(dto.SourcePodId, dto.PlayerId, dto.TargetPodId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Domain rule violation.");
            return BadRequest(new { error = "Operation not permitted." });
        }
    }
}
