// This file has tests for the list slice suffix.

// Test defvars and literal lists.

defvar Var1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
defvar Var2 = Var1[0];
defvar Var3 = Var1[2...5];

defvar Var4 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9][2];
defvar Var5 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9][2...5];

def Rec00 { // Display the defvars.
  list<int> ShowVar1 = Var1;
  int       ShowVar2 = Var2;
  list<int> ShowVar3 = Var3;
  int       ShowVar4 = Var4;
  list<int> ShowVar5 = Var5;
}

def Rec01 {
  int Zero = Var1[0];
  list<int> TwoFive = Var1[2...5];
}

// Test class template arguments.

class Class1<list<int> ids> {
  int Zero = ids[0];
  list<int> TwoFive = ids[2...5];
}

def Rec02 : Class1<[10, 11, 12, 13, 14, 15, 16, 17]>;

// Test anonymous record fetches.

def Rec03 {
  int Zero = Class1<[20, 21, 22, 23, 24, 25, 26]>.Zero;
  list<int> TwoFive = Class1<[20, 21, 22, 23, 24, 25, 26]>.TwoFive;
}

// Test multiclass template arguments.

multiclass MC1<list<int> ids> {
  def _MC1 {
    int Zero = ids[0];
    list<int> TwoFive = ids[2...5];
  }
}

defm Rec04 : MC1<[30, 31, 32, 33, 34, 35, 36]>;
defm Rec05 : MC1<[30, 31, 32, 33, 34, 35]>;

// Test taking a complex subset of the list items from another record.

def Rec06 {
  list<int> Values = [40, 41, 42, 43, 44, 45, 46, 47, 48, 49];
}

def Rec07 {
  list<int> SomeValues = Rec06.Values[0, 3...5, 0, 7, 9...6, 0];
}

// Test a double subscript.

def Rec08 {
  list<list<string>> Array = [["foo", "bar", "snork"],
                              ["zoo", "quux", "flarp"]];
  string Flarp = Array[1][2];
  list<string> ZooQuux = Array[1][0...1];
}

// Test uninitialized list elements.

def Rec09 : Class1<[?, ?, 2, 3, ?, 5, ?]>;

def Rec10 {
  int Zero = Class1<[?, ?, 2, 3, ?, 5, ?]>.Zero;
  list<int> TwoFive = Class1<[?, ?, 2, 3, ?, 5, ?]>.TwoFive;
}
