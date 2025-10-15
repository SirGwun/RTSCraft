using GameServer.Server.Game;

public enum EntityType
{
    SOLDJER,
    WORCER,
    SHIP
}
public abstract class Entity {
    public required string Id { get; init; }
    public EntityType Type { get; set; }
    public int Hp { set; get; }

    public float X { get; set; }
    public float Y { get; set; }

    public int W { get; set; }
    public int H { get; set; }

    public float Speed { get; set; }
    public bool Selectable { get; set; }

    public void Move(float deltaX, float deltaY)
    {
        X += deltaX;
        Y += deltaY;
    }
}