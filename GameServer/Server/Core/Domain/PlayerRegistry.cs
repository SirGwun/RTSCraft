using GameServer.Server.Game;
using System.Collections.Concurrent;

namespace GameServer.Server.Core.Domain;

public sealed class PlayerRegistry
{
    private readonly ConcurrentDictionary<long, Player> _players = new();

    public bool Add(Player p) => _players.TryAdd(p.Id, p);

    public bool Remove(long id) => _players.TryRemove(id, out _);

    public Player? Get(long id)
      => _players.TryGetValue(id, out var player) ? player : null;
    public int Count => _players.Count;

    public IReadOnlyDictionary<long, Player> Snapshot()
        => new Dictionary<long, Player>(_players);
}
