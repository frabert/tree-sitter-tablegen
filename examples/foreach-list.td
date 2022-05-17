class Register<string name, int idx> {
  string Name = name;
  int Index = idx;
}

foreach i = [0, 1, 2, 3, 4, 5, 6, 7] in {
  def R#i : Register<"R"#i, i>;
  def F#i : Register<"F"#i, i>;
}

def Defs {
  list<int> a = [0, 1];
  list<int> b = [2, 3];
}

foreach i = Defs.a in {
  def X#i;
}

foreach i = !listconcat(Defs.a, Defs.b) in
def Y#i;