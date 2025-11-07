import React, { useState, useEffect } from 'react';
import { Card, Input, Button, List, Avatar, Space, Empty } from 'antd';
import { MessageCircle, Send, User } from 'lucide-react';
import { useComments } from '../hooks/useComments';
import { Revision } from '../types';
import { useAuth } from '../../../contexts/AuthContext';

const { TextArea } = Input;

interface CommentsSectionProps {
  revision: Revision | null;
  canView: boolean;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  revision,
  canView
}) => {
  const { user } = useAuth();
  const { comments, adding, error, addComment, setCommentsFromRevision } = useComments(revision?._id);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (revision?.comments) {
      setCommentsFromRevision(revision.comments);
    }
  }, [revision, setCommentsFromRevision]);

  if (!canView) {
    return null;
  }

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    await addComment(newComment.trim());
    setNewComment('');
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          <span>Comments ({comments.length})</span>
        </div>
      }
      className="mt-4"
    >
      {/* Comments List */}
      {comments.length === 0 ? (
        <Empty
          description="No comments yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={comments}
          renderItem={(comment) => (
            <List.Item className="!px-0">
              <List.Item.Meta
                avatar={
                  <Avatar icon={<User />} style={{ backgroundColor: '#87d068' }}>
                    {comment.userName?.[0]?.toUpperCase()}
                  </Avatar>
                }
                title={
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{comment.userName}</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                }
                description={<p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>}
              />
            </List.Item>
          )}
        />
      )}

      {/* Add Comment Form */}
      <div className="mt-4 pt-4 border-t">
        <Space.Compact className="w-full" direction="vertical" size="small">
          <TextArea
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            maxLength={1000}
            showCount
            onPressEnter={(e) => {
              if (e.shiftKey) return;
              e.preventDefault();
              handleSubmit();
            }}
          />
          <Button
            type="primary"
            icon={<Send className="w-4 h-4" />}
            loading={adding}
            onClick={handleSubmit}
            disabled={!newComment.trim()}
            className="w-full"
          >
            Send Comment
          </Button>
        </Space.Compact>
      </div>
    </Card>
  );
};


