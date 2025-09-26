namespace GameServer.Server.Domain;

/// <summary>
/// Потокобезопасный генератор числовых идентификаторов.
/// Возвращает возрастающую последовательность: 1, 2, 3, ...
/// </summary>
public sealed class IdGen
{
    private long _id = 0;

    /// <summary>
    /// Атомарно увеличивает счётчик и возвращает новое значение.
    /// Interlocked гарантирует корректность при одновременных вызовах из разных потоков.
    /// </summary>
    public long Next() => Interlocked.Increment(ref _id);
}
