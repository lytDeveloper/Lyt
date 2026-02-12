/**
 * CommentList Component
 *
 * Displays list of comments with count
 */

import { Box, Typography } from '@mui/material';
import { useComments } from '../../hooks/useComments';
import CommentItem, { type ReplySelectPayload } from './CommentItem';
import { LightningLoader } from '../../components/common';

interface Props {
  itemId: string;
  itemType: 'project' | 'collaboration';
  onReplySelect?: (payload: ReplySelectPayload) => void;
}

export default function CommentList({ itemId, itemType, onReplySelect }: Props) {
  const { comments, isLoading } = useComments(itemId, itemType);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <LightningLoader />
      </Box>
    );
  }

  const safeComments = comments || [];

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        댓글 {safeComments.length}
      </Typography>

      {safeComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          itemId={itemId}
          itemType={itemType}
          onReplySelect={onReplySelect}
        />
      ))}

      {safeComments.length === 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
          첫 댓글을 남겨주세요!
        </Typography>
      )}
    </Box>
  );
}
