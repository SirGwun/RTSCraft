using GameServer.Server.Core.Domain;
using GameServer.Server.Web.Protocol;

namespace GameServer.Server.Web;

public sealed class Sendler
{
    private readonly PlayerRegistry _players;

    public Sendler(PlayerRegistry players) => _players = players;

    public Task SendInitialAsync(WebSocketSession sender, long myId, CancellationToken ct)
    {
        InitMsg msg = new InitMsg(myId, UnixMs.Now(), 
            _players.Snapshot()
                    .ToDictionary(
                        kv => kv.Key,
                        kv => new PlayerDto(
                            Id: kv.Value.Id,
                            Name: kv.Value.Name,
                            Color: kv.Value.Color,
                            Gold: 0,
                            Wood: 0
                        )));
        return sender.SendAsync(msg, ct);
    }

    public Task SendSnapshotAsync(WebSocketSession sender, SnapshotMsg snap, CancellationToken ct)
    {
        //validation
        return sender.SendAsync(snap, ct);
    }
}
