# Coding Standards

Follow established best practices: clear naming, small focused functions, no
dead code, handle errors explicitly, and prefer readable code over clever code.

## Semicolons

Always terminate every statement with a semicolon.

```ts
// ❌ BAD
const name = "sensei"
doThing()

// ✅ GOOD
const name = "sensei";
doThing();
```

## OOP

Model behavior with classes. Encapsulate state as private fields and expose
behavior through methods. Keep each class focused on a single responsibility.

```ts
// ✅ GOOD
class UserSession {
  #token: string;

  constructor(token: string) {
    this.#token = token;
  }

  isValid(): boolean {
    return this.#token.length > 0;
  }
}
```

## No Inline Functions

Do not define functions inline (e.g. arrow functions in JSX props or callbacks).
Declare named methods/functions and reference them.

```tsx
// ❌ BAD
<button onClick={() => doThing(id)}>Go</button>

// ✅ GOOD
const handleClick = (): void => doThing(id);
<button onClick={handleClick}>Go</button>
```

## Memoization

Use `useCallback` for functions and `useMemo` for derived values when they are
passed to child components or used as hook dependencies, to avoid unnecessary
re-renders and recomputation. Don't over-memoize trivial values.

```tsx
// ✅ GOOD
const handleClick = useCallback((): void => doThing(id), [id]);
const total = useMemo((): number => items.reduce((a, b) => a + b.price, 0), [items]);
```

## Component Separation

Break UI into small, focused components when a file grows large, a piece of
markup repeats, or a section has its own responsibility. Give each component its
own file and keep parents composed of clearly named children.

```tsx
// ❌ BAD — one giant component rendering everything inline
function Page() {
  return (
    <div>
      {/* header markup */}
      {/* sidebar markup */}
      {/* repeated card markup x10 */}
    </div>
  );
}

// ✅ GOOD — composed of focused components
function Page() {
  return (
    <Layout>
      <Header />
      <Sidebar />
      <CardList items={items} />
    </Layout>
  );
}
```

## Styling — styled-components

Use `styled-components` for styling. Define styled components separately from
component logic (and keep them out of the render body). Never use inline `style`
props or plain CSS class strings.

```tsx
// ❌ BAD
<div style={{ color: "red", padding: 8 }}>Hi</div>

// ✅ GOOD
import styled from "styled-components";

const Greeting = styled.div`
  color: red;
  padding: 8px;
`;

<Greeting>Hi</Greeting>
```
