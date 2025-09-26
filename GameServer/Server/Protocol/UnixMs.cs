namespace GameServer.Server.Protocol;

/// <summary>
/// Утилита времени: текущее Unix-время в миллисекундах (UTC).
/// Удобно для протокола и логов.
/// </summary>
public static class UnixMs
{
    public static long Now() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}
