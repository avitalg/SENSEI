import { useCallback, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";
import {
  BaseImage,
  ButtonIconImage,
  Center,
  CounterButton,
  Docs,
  FrameworkImage,
  Hero,
  LinkAnchor,
  LinkList,
  LogoImage,
  NextSteps,
  SectionIcon,
  Social,
  SocialIcon,
  Spacer,
  Ticks,
  ViteImage,
} from "./App.styles";

function App() {
  const [count, setCount] = useState(0);

  const handleIncrement = useCallback((): void => {
    setCount((current) => current + 1);
  }, []);

  return (
    <>
      <Center>
        <Hero>
          <BaseImage src={heroImg} width="170" height="179" alt="" />
          <FrameworkImage src={reactLogo} alt="React logo" />
          <ViteImage src={viteLogo} alt="Vite logo" />
        </Hero>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <CounterButton type="button" onClick={handleIncrement}>
          Count is {count}
        </CounterButton>
      </Center>

      <Ticks />

      <NextSteps>
        <Docs>
          <SectionIcon role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon" />
          </SectionIcon>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <LinkList>
            <li>
              <LinkAnchor href="https://vite.dev/" target="_blank">
                <LogoImage src={viteLogo} alt="" />
                Explore Vite
              </LinkAnchor>
            </li>
            <li>
              <LinkAnchor href="https://react.dev/" target="_blank">
                <ButtonIconImage src={reactLogo} alt="" />
                Learn more
              </LinkAnchor>
            </li>
          </LinkList>
        </Docs>
        <Social>
          <SectionIcon role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon" />
          </SectionIcon>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <LinkList>
            <li>
              <LinkAnchor href="https://github.com/vitejs/vite" target="_blank">
                <SocialIcon role="presentation" aria-hidden="true">
                  <use href="/icons.svg#github-icon" />
                </SocialIcon>
                GitHub
              </LinkAnchor>
            </li>
            <li>
              <LinkAnchor href="https://chat.vite.dev/" target="_blank">
                <SocialIcon role="presentation" aria-hidden="true">
                  <use href="/icons.svg#discord-icon" />
                </SocialIcon>
                Discord
              </LinkAnchor>
            </li>
            <li>
              <LinkAnchor href="https://x.com/vite_js" target="_blank">
                <SocialIcon role="presentation" aria-hidden="true">
                  <use href="/icons.svg#x-icon" />
                </SocialIcon>
                X.com
              </LinkAnchor>
            </li>
            <li>
              <LinkAnchor href="https://bsky.app/profile/vite.dev" target="_blank">
                <SocialIcon role="presentation" aria-hidden="true">
                  <use href="/icons.svg#bluesky-icon" />
                </SocialIcon>
                Bluesky
              </LinkAnchor>
            </li>
          </LinkList>
        </Social>
      </NextSteps>

      <Ticks />
      <Spacer />
    </>
  );
}

export default App;
