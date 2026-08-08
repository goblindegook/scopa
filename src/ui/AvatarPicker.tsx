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
  font-size: 2.25rem;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 0.5rem;
  border: 2px solid ${({ selected }) => (selected ? 'rgba(74, 222, 128, 0.9)' : 'rgba(255, 255, 255, 0.2)')};
  background-color: ${({ selected }) => (selected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, background-color 0.15s, transform 0.1s;
  line-height: 1;

  &:hover:enabled {
    border-color: rgba(255, 255, 255, 0.5);
    background-color: rgba(255, 255, 255, 0.15);
    transform: scale(1.1);
  }

  &:active:enabled {
    transform: scale(0.95);
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
