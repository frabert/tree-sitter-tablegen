multiclass A<int x> {
  foreach i = [0, 1] in {
    def NAME#i {
      int sum = !add(x, i);
    }
  }
}