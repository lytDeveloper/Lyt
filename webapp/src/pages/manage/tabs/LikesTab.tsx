import { Box, Typography, useTheme } from '@mui/material';
import TabBarBottomline from '../../../components/common/TabBarBottomline';
import type { TabItem } from '../../../components/common/TabBar';
import ProjectCard from '../../../components/explore/ProjectCard';
import CollaborationCard from '../../../components/explore/CollaborationCard';
import type { Project } from '../../../services/projectService';
import type { Collaboration } from '../../../services/collaborationService';
import LikeIconImg from '../../../assets/icon/management/like.png';

const LIKES_FILTER_TABS: TabItem<'project' | 'collaboration'>[] = [
    { key: 'project', label: '프로젝트' },
    { key: 'collaboration', label: '협업' },
];

interface LikesTabProps {
    likesFilter: 'project' | 'collaboration';
    onFilterChange: (filter: 'project' | 'collaboration') => void;
    likedProjects: Project[];
    likedCollaborations: Collaboration[];
    onProjectClick: (projectId: string) => void;
    onCollaborationClick: (collabId: string) => void;
    currentUserId?: string;
}

export default function LikesTab({
    likesFilter,
    onFilterChange,
    likedProjects,
    likedCollaborations,
    onProjectClick,
    onCollaborationClick,
    currentUserId,
}: LikesTabProps) {
    const theme = useTheme();

    return (
        <Box>
            <TabBarBottomline<'project' | 'collaboration'>
                tabs={LIKES_FILTER_TABS}
                activeTab={likesFilter}
                onTabChange={onFilterChange}
            />

            {likesFilter === 'project' ? (
                likedProjects.length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Box
                            component="img"
                            src={LikeIconImg}
                            alt="찜한 프로젝트"
                            sx={{ width: 70, height: 70 }}
                        />
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>찜한 프로젝트가 없어요</Typography>
                        <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                            마음에 드는 프로젝트를 찜해보세요
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                            <Box
                                component="img"
                                src={LikeIconImg}
                                alt="찜한 프로젝트"
                                sx={{ width: 24, height: 24, mr: 0.5 }}
                            />
                            찜한 프로젝트 {likedProjects.length}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {likedProjects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onClick={() => onProjectClick(project.id)}
                                    currentUserId={currentUserId}
                                />
                            ))}
                        </Box>
                    </Box>
                )
            ) : likedCollaborations.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                    <Box
                        component="img"
                        src={LikeIconImg}
                        alt="찜한 협업"
                        sx={{ width: 70, height: 70 }}
                    />
                    <Typography sx={{ fontWeight: 600, mb: 1 }}>찜한 협업이 없어요</Typography>
                    <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                        마음에 드는 협업을 찜해보세요
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                        <Box
                            component="img"
                            src={LikeIconImg}
                            alt="찜한 협업"
                            sx={{ width: 24, height: 24, mr: 0.5 }}
                        />
                        찜한 협업 {likedCollaborations.length}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {likedCollaborations.map((collab) => (
                            <CollaborationCard
                                key={collab.id}
                                collaboration={collab}
                                onClick={() => onCollaborationClick(collab.id)}
                                currentUserId={currentUserId}
                            />
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
