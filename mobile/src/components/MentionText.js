import React from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const MENTION_REGEX = /@([a-zA-Z0-9_.]+)/g;

// Renders caption text with @username segments as tappable links, navigating
// to that user's profile — everything else renders as plain text. Only
// usernames present in `mentionedUsers` (the ones the backend actually
// resolved to real accounts) become links; unmatched @words stay plain,
// since we don't want a typo like "@my_dawgs" appearing clickable.
export default function MentionText({ text, mentionedUsers = [], style, linkStyle, currentUserId }) {
  const navigation = useNavigation();

  if (!text) return null;

  const byUsername = new Map(
    mentionedUsers.map((u) => [u.username.toLowerCase(), u])
  );

  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  MENTION_REGEX.lastIndex = 0;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const [fullMatch, handle] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(
        <Text key={key++} style={style}>{text.slice(lastIndex, start)}</Text>
      );
    }

    const resolvedUser = byUsername.get(handle.toLowerCase());

    if (resolvedUser) {
      parts.push(
        <Text
          key={key++}
          style={[style, linkStyle]}
          onPress={() => {
            if (currentUserId && resolvedUser.id === currentUserId) {
              navigation.navigate('Profile');
            } else {
              navigation.navigate('UserProfile', {
                userId: resolvedUser.id,
                username: resolvedUser.username,
              });
            }
          }}
        >
          {fullMatch}
        </Text>
      );
    } else {
      parts.push(<Text key={key++} style={style}>{fullMatch}</Text>);
    }

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(<Text key={key++} style={style}>{text.slice(lastIndex)}</Text>);
  }

  return <Text style={style}>{parts}</Text>;
}