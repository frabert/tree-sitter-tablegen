class Base<int V> {
  int Value = V;
}

class Derived<string Truth> :
  Base<!if(!eq(Truth, "true"), 1, 0)>;

def TRUE : Derived<"true">;
def FALSE : Derived<"false">;

def X_NE {
  bit a = !ne("true", "false");
  bit b = !ne("foo", "foo");
}