using GameServer.Server.Game;

public class Unit : Entity {

    public int Attack {  get; set; }
    public Player Owner { get; set; }
    public Unit(string Id,
                Player owner,
                EntityType Type,
                float X,
                float Y,
                int W,
                int H,
                int Hp,
                int Attack,
                int speed)
    {
        this.Id = Id;
        this.Owner = owner;
        this.Type = Type;
        this.X = X;
        this.Y = Y;
        this.W = W;
        this.H = H;
        this.Hp = Hp;
        this.Attack = Attack;
        this.Speed = speed;
    }
}
