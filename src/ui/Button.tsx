import styled from '@emotion/styled'

export const Button = styled('button')`
  position: relative;
  border-radius: 0.5rem;
  padding: 0.5rem 1.5rem;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  background: oklch(46% 0.15 152);
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 15px oklch(46% 0.15 152 / 0.4);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:hover {
    background: oklch(54% 0.16 152);
    box-shadow: 0 6px 20px oklch(46% 0.15 152 / 0.6);
  }

  &:active {
    transform: translateY(0);
    background: oklch(38% 0.13 152);
    box-shadow: 0 2px 10px oklch(46% 0.15 152 / 0.4);
  }

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: 0 2px 8px oklch(46% 0.15 152 / 0.2);

    &:hover {
      background: oklch(46% 0.15 152);
      box-shadow: 0 2px 8px oklch(46% 0.15 152 / 0.2);
    }
  }

  @media (max-height: 600px) {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
  }
`
