---
type: quiz
title: "W12 · Weekly Test: React Fundamentals and Stacks"
slug: w12-weekly-test
topic: Week 12 Assessment
subject: web-development
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on React components, JSX, props, state, lists and keys, controlled forms, useEffect and lifting state up, plus stacks and queues. 15 questions, 25 minutes.
---
Q: Which are valid JSX differences from HTML? (Select all that apply.)
*A) class is written as className
*B) for on a label is written as htmlFor
C) Event handlers are written in lowercase, such as onclick
*D) Elements such as img and input must be closed, as in `<img />`
Explanation: React event props are camelCase, such as onClick and onChange.

Q: Why must a React component's name start with a capital letter?
A) It is only a style convention with no effect
*B) JSX treats lowercase tags as HTML elements and capitalised tags as components
C) Capitalised functions run faster
D) Vite rejects lowercase file names
Explanation: `<itemCard />` would be treated as an unknown HTML tag; `<ItemCard />` calls your component.

Q: A child component receives a price prop and wants to change it. What is the correct approach?
A) Assign a new value to props.price
B) Copy it into a global variable and change that
*C) Call a callback prop from the parent, which updates its state and passes a new price down
D) Use document.querySelector to edit the displayed price
Explanation: Props are read-only. The owner of the state changes it, and data flows down again as props.

Q: `const [count, setCount] = useState(0);` A click handler runs `setCount(count + 1); setCount(count + 1);`. What is count after one click?
*A) 1
B) 2
C) 0
D) It throws an error
Explanation: Both calls use the same count from this render (0). Use setCount((c) => c + 1) twice to add 2.

Q: Which update adds an item to an items array in state correctly?
A) items.push(newItem); setItems(items);
*B) setItems([...items, newItem]);
C) items[items.length] = newItem;
D) setItems(items.concat).push(newItem);
Explanation: State must be replaced with a new array; mutating the existing array may not trigger a re-render.

Q: What is wrong with `<button onClick={deleteItem(item.id)}>Delete</button>`?
A) Nothing, it works correctly
*B) deleteItem is called during render instead of on click
C) onClick does not accept functions
D) item.id must be a string
Explanation: Pass a function: onClick={() => deleteItem(item.id)}.

Q: A list renders `{items.length && <ItemGrid items={items} />}` and items is empty. What appears?
A) Nothing
*B) The number 0
C) An empty ItemGrid
D) The word false
Explanation: 0 && anything evaluates to 0, which React renders. Use items.length > 0 && ...

Q: Which are good choices for a key in a list of marketplace items that can be filtered, sorted and deleted? (Select all that apply.)
*A) item.id from the data
B) The array index from map
C) Math.random() called during render
*D) A unique, unchanging slug stored on each item
Explanation: Keys must be unique among siblings and stable across renders. Indexes shift when items are removed or reordered, and random keys change on every render.

Q: What does a controlled input need?
A) Only a defaultValue attribute
*B) A value taken from state and an onChange handler that updates that state
C) A ref and document.getElementById
D) The required attribute
Explanation: value without onChange makes a read-only input; the pair makes React state the single source of truth.

Q: When does `useEffect(fn, [])` run fn?
A) Before every render
*B) Once after the component first renders
C) After every render
D) Only when the component is removed
Explanation: An empty dependency array means no values can change, so the effect runs once after mount (twice in development under StrictMode).

Q: An effect fetches results whenever query changes. Why return `() => controller.abort()` from it?
A) To make the request faster
*B) To cancel the outdated request when query changes or the component is removed
C) Because effects must always return a function
D) To retry the request on failure
Explanation: Without cleanup, a slow old response could arrive last and overwrite newer results.

Q: A component stores filtered items with `useEffect(() => setVisible(items.filter(match)), [items, query])`. What is the better approach?
A) Add more dependencies to the array
*B) Calculate visible directly during render: const visible = items.filter(match)
C) Move the filter into a setTimeout
D) Store the filter in localStorage
Explanation: Values derived from props or state should be calculated during render; effects are for the outside world.

Q: SearchBox changes the search text, and its sibling ItemGrid must filter by it. Where should the search state live?
A) In SearchBox, read by ItemGrid through the DOM
B) In ItemGrid only
*C) In their closest common parent, passed down as props with an onChange callback
D) In a global variable outside React
Explanation: Lift state up to the lowest common parent of every component that needs it.

Q: A buggy bracket checker pushes every "(" or "[" and, for every ")" or "]", pops the stack if it is not empty, without comparing anything. It returns True when the stack is empty at the end. What does it return for "([)]", and what is the correct answer?
A) False; correct answer False
*B) True; correct answer False
C) True; correct answer True
D) False; correct answer True
Explanation: Two pushes and two pops leave the stack empty, so the buggy version says True. A correct checker compares the top with the expected opener: ")" meets "[" on top, so "([)]" is invalid.

Q: In Daily Temperatures with a monotonic stack, what is stored on the stack?
A) The temperatures in increasing order
*B) Indices of days still waiting for a warmer day
C) The answers for each day
D) Every pair of days
Explanation: Indices let you compute i - j when a warmer day i resolves day j; each index is pushed and popped at most once, giving O(n).
