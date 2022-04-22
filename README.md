# A very simple language
- [ ] comments
- [X] no mutability 
- [ ] error messages
- [X] extremely slow
- [X] zero dependencies
- [ ] good errors

run with:
```sh
cat sample.l | deno run ./index.ts
```

**Types:**
```hs
number: 0
function: a => b => a
string: "Hello im a string"
boolean: true | false
object: { a: 0 b: 10 c: (=> "42") }
```

**Variables:**
```hs
x = 5
addTwo = (add 2)
y = (addTwo 5)
```

**defining functions:**
```hs
a => b => (add a b)
```
or
```hs
a b => (add a b)
```
or
```hs
=> "I am returned from a function without arguments!"
```
* * *
**Examples:**
```hs
factorial = n => (if (eq n 0)
    (=> 1)
    (=> (mul n (factorial (sub n 1))))
)
fibonacci = n => (if (eq n 0)
    (=> 0)
    (=> (if (eq n 1)
        (=> 1)
        (=> ((add (fibonacci (sub n 1)) (fibonacci (sub n 2))))))))
```

linked list:

```hs
cons = a list => { head: a tail: list }
head = (# "head")
tail = (# "tail")

range = n => (if (le n 1)
    (=> false)
    (=> ({ head: n tail: (range (sub n 1)) })))

len = list => 
    (if (eq (type (tail list)) "boolean")
        (=> 1)
        (=> (add (len (tail list)) 1)))

map = f => list => 
    (if (eq (type list) "object")
        (=> { head: (f (head list)) tail: (map f (tail list)) })
        (=> false))
```
