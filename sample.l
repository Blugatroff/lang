# = getField
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

factorial = n => (if (eq n 0)
    (=> 1)
    (=> (mul n (factorial (sub n 1))))
)

fibonacci = n => (if (eq n 0)
    (=> 0)
    (=> (if (eq n 1)
        (=> 1)
        (=> ((add (fibonacci (sub n 1)) (fibonacci (sub n 2))))))))

(print "Factorial")
(map print (map factorial (range 20)))
(print "Fibonacci")
(map print (map fibonacci (range 25)))
