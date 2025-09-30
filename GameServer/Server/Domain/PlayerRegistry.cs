using System.Collections.Concurrent;

namespace GameServer.Server.Domain;

/// <summary>
/// Потокобезопасное хранилище игроков.
/// Один источник истины для "кто сейчас в игре".
/// </summary>
public sealed class PlayerRegistry
{
    private readonly ConcurrentDictionary<long, Player> _players = new();

    /// <summary>Добавить игрока. Возвращает false, если id уже занят.</summary>
    public bool Add(Player p) => _players.TryAdd(p.Id, p);

    /// <summary>Удалить игрока по id. true, если был удалён.</summary>
    public bool Remove(long id) => _players.TryRemove(id, out _);

    /// <summary>Попробовать получить игрока.</summary>
    public bool TryGet(long id, out Player player) => _players.TryGetValue(id, out player!);

    /// <summary>Текущее количество игроков.</summary>
    public int Count => _players.Count;

    /// <summary>
    /// Снимок (копия) текущего набора игроков для безопасной итерации/сериализации.
    /// Не "живой" словарь, изменения после вызова сюда не попадают.
    /// </summary>
    public IReadOnlyDictionary<long, Player> Snapshot()
        => new Dictionary<long, Player>(_players);
}
