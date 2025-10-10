using GameServer.Server.Domain;
using GameServer.Server.Protocol;

namespace GameServer.Server;

/// <summary>Собирает и отправляет начальный snapshot сразу после join.</summary>
public sealed class SnapshotService
{
    private readonly PlayerRegistry _players;

    public SnapshotService(PlayerRegistry players) => _players = players;

    public Task SendInitialAsync(WebSocketSession sender, long myId, CancellationToken ct)
    {
        var players = _players
            .Snapshot()
            .ToDictionary(
                kv => kv.Key,
                kv => new PlayerDto(
                    Id: kv.Value.Id,
                    Name: kv.Value.Name,
                    Color: kv.Value.Color,
                    Gold: 0,
                    Wood: 0
                )
            );


        var msg = new SnapshotMsg
        {
            Time = UnixMs.Now(),
            MyId = myId,
            Players = players,
            Entities = new Dictionary<long, EntityDto>() // позже заполним из авторитетного мира
        };

        return sender.SendAsync(msg, ct);
    }
}
