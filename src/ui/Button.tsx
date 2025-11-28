import styled from '@emotion/styled'

export const Button = styled('button')`
  position: relative;
  border-radius: 0.5rem;
  padding: 0.5rem 1.5rem;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: box-shadow 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow: hidden;
  z-index: 1;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      #667eea 0%,
      #764ba2 50%,
      #667eea 100%
    );
    background-size: 200% 200%;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
    border-radius: 0.5rem;
  }

  &:hover {
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);

    &::before {
      opacity: 1;
      animation: gradientShift 1.5s linear infinite;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
  }

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }

  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    100% {
      background-position: 200% 50%;
    }
  }
`
