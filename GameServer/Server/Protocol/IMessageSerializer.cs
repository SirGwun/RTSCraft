using System.Net.WebSockets;

namespace GameServer.Server.Protocol;

public interface IMessageSerializer
{
    object Deserialize(string json);
    Task SendAsync(WebSocket socket, object payload, CancellationToken ct);

    // Ќовое: прочитать из сокета ќƒЌќ приложение-сообщение.
    // ¬озвращает:
    //  - DTO (PingMsg/JoinMsg/...) Ч если пришЄл текстовый JSON,
    //  - null Ч если получен Close,
    //  - MsgBase без type Ч если было бинарное сообщение (мы его игнорируем).
    Task<object?> ReceiveAsync(WebSocket socket, byte[] buffer, CancellationToken ct);
}

