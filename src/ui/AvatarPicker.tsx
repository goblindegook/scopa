import styled from '@emotion/styled'
import { useTranslation } from 'react-i18next'

export const AVATARS = ['🐵', '🐶', '🦊', '🐱', '🦁', '🐷', '🐭', '🐼', '🐸', '🐙']

const Section = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
`

const Label = styled('p')`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`

const Grid = styled('div')`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
  width: 100%;
`

const AvatarButton = styled('button')<{ selected: boolean }>`
  position: relative;
  font-size: 2.25rem;
  width: 100%;
  aspect-ratio: 1;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 0.5rem;
    border: 2px solid ${({ selected }) => (selected ? 'rgba(74, 222, 128, 0.9)' : 'rgba(255, 255, 255, 0.2)')};
    background-color: ${({ selected }) => (selected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)')};
    transition: border-color 0.15s, background-color 0.15s;
  }

  &:hover:enabled::before {
    border-color: rgba(255, 255, 255, 0.5);
    background-color: rgba(255, 255, 255, 0.15);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`

interface AvatarPickerProps {
  readonly selected?: string
  readonly taken?: readonly string[]
  readonly onSelect: (avatar: string) => void
}

export const AvatarPicker = ({ selected, taken = [], onSelect }: AvatarPickerProps) => {
  const { t } = useTranslation()

  return (
    <Section>
      <Label>{t('chooseAvatar')}</Label>
      <Grid>
        {AVATARS.map((emoji) => (
          <AvatarButton
            key={emoji}
            selected={selected === emoji}
            disabled={taken.includes(emoji)}
            aria-label={t('selectAvatar', { emoji })}
            aria-pressed={selected === emoji}
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </AvatarButton>
        ))}
      </Grid>
    </Section>
  )
}
