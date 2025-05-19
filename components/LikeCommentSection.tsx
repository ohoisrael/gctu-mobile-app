import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import moment from 'moment';
import { useUser } from '@/context/UserContext';
import { Colors } from '@/constants/Colors';
import { EXPO_API_URL } from '@env';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  role?: string;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  User: User;
  status: 'pending' | 'approved' | 'rejected';
}

interface Props {
  newsId: number;
  userId: number;
  isModalVisible: boolean;
  setIsModalVisible: (visible: boolean) => void;
  toggleLike: () => void;
  likes: number;
  isLiked: boolean;
}

// Confirmation Modal Component
const ConfirmationModal = ({
  visible,
  action,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  action: 'delete' | 'approve';
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Modal
    transparent={true}
    visible={visible}
    animationType='fade'
    onRequestClose={onCancel}
  >
    <View style={styles.confirmationModalContainer}>
      <View style={styles.confirmationModal}>
        <Text style={styles.confirmationText}>
          Are you sure you want to {action} this comment?
        </Text>
        <View style={styles.confirmationButtons}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelConfirmButton}>
            <Text style={styles.cancelConfirmText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmText}>
              {action === 'delete' ? 'Delete' : 'Approve'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// Memoized Comment Item
const CommentItem = React.memo(
  ({
    item,
    user,
    onEdit,
    onDelete,
    onApprove,
    isProcessing,
  }: {
    item: Comment;
    user: User | null;
    onEdit: (id: number, content: string) => void;
    onDelete: (id: number) => void;
    onApprove: (id: number) => void;
    isProcessing: boolean;
  }) => (
    <View style={styles.comment}>
      {item.User.profilePicture && (
        <Image
          source={{ uri: item.User.profilePicture }}
          style={styles.profilePicture}
        />
      )}
      <View style={styles.commentContent}>
        <Text style={styles.commentUser}>
          {item.User.firstName + ' ' + item.User.lastName}
        </Text>
        <Text style={styles.commentText}>{item.content}</Text>
        <Text style={styles.commentDate}>
          {moment(item.createdAt).fromNow()}
        </Text>
        {item.status === 'pending' && (
          <Text style={styles.pendingText}>Pending Approval</Text>
        )}
      </View>
      {user?.role === 'admin' && (
        <View style={styles.actionButtons}>
          {item.User.id === user.id && (
            <TouchableOpacity
              onPress={() => onEdit(item.id, item.content)}
              disabled={isProcessing}
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            disabled={isProcessing}
            style={isProcessing ? styles.disabledButton : null}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.deleteText}>Delete</Text>
            )}
          </TouchableOpacity>
          {item.status === 'pending' && (
            <TouchableOpacity
              onPress={() => onApprove(item.id)}
              disabled={isProcessing}
              style={isProcessing ? styles.disabledButton : null}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.approveText}>Approve</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
);

const LikeCommentSection: React.FC<Props> = ({
  newsId,
  userId,
  isModalVisible,
  setIsModalVisible,
  toggleLike,
  likes,
  isLiked,
}) => {
  const { user, token } = useUser();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState<string>('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    action: 'delete' | 'approve' | null;
    commentId: number | null;
  }>({ visible: false, action: null, commentId: null });

  // Fetch comments
  const { data: commentsData, isFetching: loadingMore } = useQuery({
    queryKey: ['comments', newsId, page],
    queryFn: async () => {
      const response = await axios.get(
        `${EXPO_API_URL}/api/comments/${newsId}?page=${page}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    enabled: isModalVisible && !!token && !!newsId,
    keepPreviousData: true,
    onError: () => {
      Alert.alert('Error', 'Failed to fetch comments.');
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      await axios.post(
        `${EXPO_API_URL}/api/comments/${newsId}`,
        { userId, content: newComment.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      setNewComment('');
      Alert.alert(
        'Success',
        user?.role === 'admin'
          ? 'Comment added successfully.'
          : 'We have received your comment successfully and will review.'
      );
      queryClient.invalidateQueries(['comments', newsId]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to submit comment.');
    },
  });

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: async () => {
      await axios.put(
        `${EXPO_API_URL}/api/comments/edit/${editingCommentId}`,
        { content: editingContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingContent('');
      Alert.alert('Success', 'Comment updated successfully.');
      queryClient.invalidateQueries(['comments', newsId]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to edit comment.');
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await axios.delete(`${EXPO_API_URL}/api/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: (_, commentId) => {
      queryClient.setQueryData(['comments', newsId, page], (oldData: any) => ({
        ...oldData,
        comments: oldData.comments.filter((c: Comment) => c.id !== commentId),
        totalCount: oldData.totalCount - 1,
      }));
      Alert.alert('Success', 'Comment deleted successfully.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete comment.');
    },
  });

  // Approve comment mutation
  const approveCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await axios.put(
        `${EXPO_API_URL}/api/comments/approve/${commentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      Alert.alert('Success', 'Comment approved successfully.');
      queryClient.invalidateQueries(['comments', newsId]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to approve comment.');
    },
  });

  const handleDeleteComment = useCallback((commentId: number) => {
    setConfirmationModal({
      visible: true,
      action: 'delete',
      commentId,
    });
  }, []);

  const handleApproveComment = useCallback((commentId: number) => {
    setConfirmationModal({
      visible: true,
      action: 'approve',
      commentId,
    });
  }, []);

  const confirmAction = useCallback(() => {
    const { action, commentId } = confirmationModal;
    if (!action || !commentId) return;

    setConfirmationModal({ visible: false, action: null, commentId: null });

    if (action === 'delete') {
      deleteCommentMutation.mutate(commentId);
    } else if (action === 'approve') {
      approveCommentMutation.mutate(commentId);
    }
  }, [confirmationModal, deleteCommentMutation, approveCommentMutation]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.header}>
            <Text style={styles.headerText}>Comments</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.black} />
            </TouchableOpacity>
          </View>

          <View style={styles.likeContainer}>
            <TouchableOpacity onPress={toggleLike} style={styles.likeButton}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? Colors.tint : Colors.black}
              />
              <Text style={styles.likeText}>{likes} Likes</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={
              user?.role === 'admin'
                ? commentsData?.comments || []
                : (commentsData?.comments || []).filter((comment: Comment) => comment.status === 'approved')
            }
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <CommentItem
                item={item}
                user={user}
                onEdit={(id, content) => {
                  setEditingCommentId(id);
                  setEditingContent(content);
                }}
                onDelete={handleDeleteComment}
                onApprove={handleApproveComment}
                isProcessing={
                  deleteCommentMutation.isPending && deleteCommentMutation.variables === item.id ||
                  approveCommentMutation.isPending && approveCommentMutation.variables === item.id
                }
              />
            )}
            style={styles.commentsList}
          />

          {commentsData?.comments?.length === 0 && (
            <View style={styles.noCommentsContainer}>
              <Text style={styles.noCommentsText}>
                No approved comments yet! Be the first to comment 🗣
              </Text>
            </View>
          )}

          {commentsData?.totalCount > commentsData?.comments?.length && (
            <TouchableOpacity
              onPress={() => setPage((prev) => prev + 1)}
              style={styles.viewMoreButton}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.viewMoreText}>View More Comments</Text>
              )}
            </TouchableOpacity>
          )}

          {editingCommentId ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Edit comment..."
                placeholderTextColor={Colors.placeholderText}
                value={editingContent}
                onChangeText={setEditingContent}
                multiline
              />
              <TouchableOpacity
                onPress={() => editCommentMutation.mutate()}
                disabled={editCommentMutation.isPending}
              >
                {editCommentMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.editButton}>Update</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditingCommentId(null);
                  setEditingContent('');
                }}
              >
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Add a comment"
                placeholderTextColor={Colors.placeholderText}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                onPress={() => addCommentMutation.mutate()}
                disabled={addCommentMutation.isPending || !newComment.trim()}
              >
                {addCommentMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="send" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>

        <ConfirmationModal
          visible={confirmationModal.visible}
          action={confirmationModal.action || 'delete'}
          onConfirm={confirmAction}
          onCancel={() =>
            setConfirmationModal({ visible: false, action: null, commentId: null })
          }
        />
      </View>
    </Modal>
  );
};

export default LikeCommentSection;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardAvoidingView: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeText: {
    marginLeft: 5,
    color: Colors.black,
    fontSize: 14,
  },
  comment: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    fontWeight: 'bold',
    color: Colors.black,
  },
  commentText: {
    color: Colors.black,
  },
  commentDate: {
    fontSize: 12,
    color: Colors.darkGrey,
  },
  pendingText: {
    fontSize: 12,
    color: Colors.tint,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    color: Colors.white,
  },
  editText: {
    marginRight: 10,
    color: Colors.primary,
  },
  cancelButton: {
    borderRadius: 5,
    marginLeft: 8,
    padding: 10,
    backgroundColor: Colors.tint,
    marginTop: 5,
    color: Colors.white,
  },
  deleteText: {
    marginRight: 10,
    color: Colors.tint,
  },
  approveText: {
    marginRight: 10,
    color: Colors.primary,
  },
  commentsList: {
    marginTop: 10,
    maxHeight: 300,
  },
  viewMoreButton: {
    alignItems: 'center',
    marginVertical: 10,
  },
  viewMoreText: {
    color: Colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: Colors.lightGrey,
    paddingTop: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: 20,
    marginRight: 10,
    fontSize: 14,
    color: Colors.black,
  },
  disabledButton: {
    opacity: 0.6,
  },
  noCommentsContainer: {
    alignItems: 'center',
    padding: 10,
    marginTop: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  noCommentsText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.black,
    textAlign: 'center',
  },
  confirmationModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  confirmationModal: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: Colors.black,
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelConfirmButton: {
    backgroundColor: Colors.lightGrey,
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelConfirmText: {
    color: Colors.black,
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  confirmText: {
    color: Colors.white,
    fontSize: 14,
  },
});