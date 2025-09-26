using System.Net.WebSockets;
using GameServer.Server.Protocol;
using GameServer.Server.Domain;
using GameServer.Server.Application;

namespace GameServer.Server.Infra;

public sealed class WebSocketSession : ISender
{
    private readonly WebSocket _socket;
    private readonly IMessageSerializer _serializer;
    private readonly IdGen _ids;
    private readonly PlayerRegistry _players;
    private readonly SnapshotService _snapshots;

    public long? PlayerId { get; private set; }

    public WebSocketSession(
        WebSocket socket,
        IMessageSerializer serializer,
        IdGen ids,
        PlayerRegistry players,
        SnapshotService snapshots)
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
                if (msg is null) break;                                  // Close
                if (msg is MsgBase { Type: null }) continue;              // бинарь/мусор

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
                        // 1) Генерим серверный id
                        var id = _ids.Next();

                        // 2) Регистрируем игрока в реестре
                        _players.Add(new Player { Id = id, Name = join.Name, Color = join.Color });

                        // 3) Привязываем id к сессии (пригодится для команд/очистки)
                        PlayerId = id;

                        Console.WriteLine($"[JOIN] #{id} name='{join.Name}' color='{join.Color}'");

                        // 4) Отправляем первоначальный snapshot с myId
                        await _snapshots.SendInitialAsync(this, id, ct);
                        break;

                    default:
                        // другие типы пока игнорируем
                        break;
                }
            }
        }
        finally
        {
            await SafeCloseAsync(ct);
            if (PlayerId is long pid) _players.Remove(pid); // отписка при разрыве
        }
    }

    // Реализация ISender — просто делегируем сериализатору
    public Task SendAsync(object payload, CancellationToken ct)
        => _serializer.SendAsync(_socket, payload, ct);

    private async Task SafeCloseAsync(CancellationToken ct)
    {
        if (_socket.State is WebSocketState.Closed or WebSocketState.Aborted) return;
        try { await _socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", ct); } catch { }
    }
}
