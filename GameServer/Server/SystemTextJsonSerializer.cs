using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using GameServer.Server.Protocol;

namespace GameServer.Server;
using GameServer.Server.Protocol;

public sealed class SystemTextJsonSerializer
{
    public object Deserialize(string json)
    {
        var env = JsonSerializer.Deserialize<MsgBase>(json, Json.Options);
        return env?.Type switch
        {
            "ping" => JsonSerializer.Deserialize<PingMsg>(json, Json.Options)!,
            "join" => JsonSerializer.Deserialize<JoinMsg>(json, Json.Options)!,
            "snapshot" => JsonSerializer.Deserialize<SnapshotMsg>(json, Json.Options)!,
            _ => env ?? new MsgBase()
        };
    }

    public async Task<object?> ReceiveAsync(WebSocket socket, byte[] buffer, CancellationToken ct)
    {
        using var ms = new MemoryStream();

        while (!ct.IsCancellationRequested && socket.State == WebSocketState.Open)
        {
            var result = await socket.ReceiveAsync(buffer, ct);

            if (result.MessageType == WebSocketMessageType.Close)
                return null;

            if (result.MessageType != WebSocketMessageType.Text)
            {
                if (!result.EndOfMessage)
                {
                    do { result = await socket.ReceiveAsync(buffer, ct); }
                    while (!result.EndOfMessage && socket.State == WebSocketState.Open);
                }
                return new MsgBase(); // без type → сессия пропустит
            }

            ms.Write(buffer, 0, result.Count);

            if (result.EndOfMessage)
            {
                var json = Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
                return Deserialize(json);
            }
        }

        return null;
    }

    public Task SendAsync(WebSocket socket, object payload, CancellationToken ct)
    {
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload, Json.Options));
        return socket.SendAsync(bytes, WebSocketMessageType.Text, true, ct);
    }
}
