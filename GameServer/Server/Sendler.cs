using GameServer.Server.Domain;
using GameServer.Server.Protocol;

namespace GameServer.Server;

public sealed class Sendler
{
    private readonly PlayerRegistry _players;

    public Sendler(PlayerRegistry players) => _players = players;

    public Task SendInitialAsync(WebSocketSession sender, long myId, CancellationToken ct)
    {
        var msg = new InitMsg
        {
            ServerTime = UnixMs.Now(),
            MyId = myId,
            Players = _players
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
                )
        };

        return sender.SendAsync(msg, ct);
    }

    public Task SendSnapshotAsync(WebSocketSession sender, SnapshotMsg snap, CancellationToken ct)
    {
        //validation
        return sender.SendAsync(snap, ct);
    }
}
