using System.Net.WebSockets;
using GameServer.Server.Protocol;
using GameServer.Server.Domain;

namespace GameServer.Server;

public sealed class WebSocketSession
{
    private readonly WebSocket _socket;
    private readonly SystemTextJsonSerializer _serializer;
    private readonly IdGen _ids;
    private readonly PlayerRegistry _players;
    private readonly Sendler _snapshots;

    public long? PlayerId { get; private set; }

    public WebSocketSession(
        WebSocket socket,
        SystemTextJsonSerializer serializer,
        IdGen ids,
        PlayerRegistry players,
        Sendler snapshots)
    {
        _socket = socket;
        _serializer = serializer;
        _ids = ids;
        _players = players;
        _snapshots = snapshots;
    }

    public async Task RunAsync(CancellationToken ct)
    {
        var buffer = new byte[8 * 1024];

        try
        {
            while (!ct.IsCancellationRequested && _socket.State == WebSocketState.Open)
            {
                var msg = await _serializer.ReceiveAsync(_socket, buffer, ct);

                if (msg is null) continue;

                if (msg is CommandBase cmd)
                {
                    Console.WriteLine("[CMD] " + cmd);
                    continue;
                }

                if (msg is JoinMsg)
                {
                    Console.WriteLine("[JOIN] " + msg);
                }
                
                switch (msg)
                {
                    case PingMsg ping:
                        await _serializer.SendAsync(_socket, new PongMsg
                        {
                            ServerTime = UnixMs.Now(),
                            ClientTime = ping.ClientTime
                        }, ct);
                        break;
                    case JoinMsg join:
                        var id = _ids.Next();

                        _players.Add(new Player { Id = id, Name = join.Name, Color = join.Color });

                        PlayerId = id;

                        Console.WriteLine($"[JOIN] #{id} name='{join.Name}' color='{join.Color}'");

                        await _snapshots.SendInitialAsync(this, id, ct);
                        break;
                    default:
                        Console.WriteLine($"[WARN] Unknown message: {msg}");
                        break;
                }
            }
        }
        finally
        {
            await SafeCloseAsync(ct);
            if (PlayerId is long pid) _players.Remove(pid);
        }
    }

    public Task SendAsync(MsgBase payload, CancellationToken ct)
        => _serializer.SendAsync(_socket, payload, ct);

    private async Task SafeCloseAsync(CancellationToken ct)
    {
        if (_socket.State is WebSocketState.Closed or WebSocketState.Aborted) return;
        try { await _socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", ct); } catch { }
    }
}
