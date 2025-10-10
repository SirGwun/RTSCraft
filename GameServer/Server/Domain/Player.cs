
namespace GameServer.Server.Domain;

/// <summary>
/// Доменная модель игрока: идентичность и базовые свойства.
/// Никакой транспортной логики, никаких ссылок на сокеты.
/// </summary>
public sealed class Player
{
    /// <summary>Серверный идентификатор (выдаёт IdGen).</summary>
    public long Id { get; init; }

    /// <summary>Ник из сообщения join.</summary>
    public string Name { get; init; } = "";

    /// <summary>Выбранный цвет из сообщения join (как строка, например "#22aa66").</summary>
    public string Color { get; init; } = "";

    // Ниже — потенциальные поля на будущее. Пока не трогаем.
    // public int Gold { get; set; } = 0;
    // public int Wood { get; set; } = 0;
    // public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    // public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;
}
