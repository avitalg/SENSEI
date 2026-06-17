import styled from "styled-components";

export const Center = styled.section`
  display: flex;
  flex-direction: column;
  gap: 25px;
  place-content: center;
  place-items: center;
  flex-grow: 1;

  @media (max-width: 1024px) {
    padding: 32px 20px 24px;
    gap: 18px;
  }
`;

export const Hero = styled.div`
  position: relative;
`;

export const BaseImage = styled.img`
  inset-inline: 0;
  margin: 0 auto;
  width: 170px;
  position: relative;
  z-index: 0;
`;

export const FrameworkImage = styled.img`
  inset-inline: 0;
  margin: 0 auto;
  position: absolute;
  z-index: 1;
  top: 34px;
  height: 28px;
  transform: perspective(2000px) rotateZ(300deg) rotateX(44deg) rotateY(39deg)
    scale(1.4);
`;

export const ViteImage = styled.img`
  inset-inline: 0;
  margin: 0 auto;
  position: absolute;
  z-index: 0;
  top: 107px;
  height: 26px;
  width: auto;
  transform: perspective(2000px) rotateZ(300deg) rotateX(40deg) rotateY(39deg)
    scale(0.8);
`;

export const CounterButton = styled.button`
  font-family: var(--mono);
  display: inline-flex;
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 5px;
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
  transition: border-color 0.3s;
  margin-bottom: 24px;

  &:hover {
    border-color: var(--accent-border);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

export const Ticks = styled.div`
  position: relative;
  width: 100%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4.5px;
    border: 5px solid transparent;
  }

  &::before {
    left: 0;
    border-left-color: var(--border);
  }
  &::after {
    right: 0;
    border-right-color: var(--border);
  }
`;

export const NextSteps = styled.section`
  display: flex;
  border-top: 1px solid var(--border);
  text-align: left;

  @media (max-width: 1024px) {
    flex-direction: column;
    text-align: center;
  }
`;

export const Docs = styled.div`
  flex: 1 1 0;
  padding: 32px;
  border-right: 1px solid var(--border);

  @media (max-width: 1024px) {
    padding: 24px 20px;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
`;

export const Social = styled.div`
  flex: 1 1 0;
  padding: 32px;

  @media (max-width: 1024px) {
    padding: 24px 20px;
  }
`;

export const SectionIcon = styled.svg`
  margin-bottom: 16px;
  width: 22px;
  height: 22px;
`;

export const LinkList = styled.ul`
  list-style: none;
  padding: 0;
  display: flex;
  gap: 8px;
  margin: 32px 0 0;

  @media (max-width: 1024px) {
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;

    li {
      flex: 1 1 calc(50% - 8px);
    }
  }
`;

export const LinkAnchor = styled.a`
  color: var(--text-h);
  font-size: 16px;
  border-radius: 6px;
  background: var(--social-bg);
  display: flex;
  padding: 6px 12px;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  transition: box-shadow 0.3s;

  &:hover {
    box-shadow: var(--shadow);
  }

  @media (max-width: 1024px) {
    width: 100%;
    justify-content: center;
    box-sizing: border-box;
  }
`;

export const LogoImage = styled.img`
  height: 18px;
`;

export const ButtonIconImage = styled.img`
  height: 18px;
  width: 18px;
`;

export const SocialIcon = styled.svg`
  height: 18px;
  width: 18px;

  @media (prefers-color-scheme: dark) {
    filter: invert(1) brightness(2);
  }
`;

export const Spacer = styled.section`
  height: 88px;
  border-top: 1px solid var(--border);

  @media (max-width: 1024px) {
    height: 48px;
  }
`;
