class Register<string name, int idx> {
  string Name = name;
  int Index = idx;
}

foreach i = 0...3 in
  def Q#i : Register<"Q"#i, i>;

foreach i = [0, 1, 2, 3, 4, 5, 6, 7] in
  def R#i : Register<"R"#i, i>;

foreach i = {0...3,9...7} in {
  def S#i : Register<"Q"#i, i>;
  def : Register<"T"#i, i>;
}