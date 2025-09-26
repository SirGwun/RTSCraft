using System.Text.Json;
using System.Text.Json.Serialization;

namespace GameServer.Server.Protocol;

/// <summary>
/// Общие JSON-настройки для протокола: camelCase и игнорирование null.
/// Используется сериализатором при отправке/чтении сообщений.
/// </summary>
public static class Json
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };
}
