import { Box, Typography, useTheme, FormControlLabel, Switch } from '@mui/material';
import { styled } from '@mui/material/styles';
import TabBarBottomline from '../../../components/common/TabBarBottomline';
import type { TabItem } from '../../../components/common/TabBar';
import ItemCard from '../../../components/manage/ItemCard';
import AnimatedItemCard from '../../../components/manage/AnimatedItemCard';
import PartnershipCard from '../../../components/manage/PartnershipCard';
import type { PartnershipData } from '../../../components/manage/PartnershipCard';
import type { Project } from '../../../services/projectService';
import type { Collaboration } from '../../../services/collaborationService';
import type { ProjectStatus } from '../../../types/exploreTypes';
import ProjectIconImg from '../../../assets/icon/management/project.png';
import CollaborationIconImg from '../../../assets/icon/management/collaboration.png';
import PartnershipIconImg from '../../../assets/icon/management/partnership.png';

const PROJECT_FILTER_TABS: TabItem<'project' | 'collaboration' | 'partnership'>[] = [
    { key: 'project', label: '프로젝트' },
    { key: 'collaboration', label: '협업' },
    { key: 'partnership', label: '파트너십' },
];

const NotificationSwitch = styled(Switch)(({ theme }) => ({
    width: 30,
    height: 18,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 3,
        transitionDuration: '200ms',
        '&.Mui-checked': {
            transform: 'translateX(12px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.primary.main,
                opacity: 1,
            },
        },
    },
    '& .MuiSwitch-thumb': {
        width: 12,
        height: 12,
    },
    '& .MuiSwitch-track': {
        borderRadius: 26 / 2,
        backgroundColor: theme.palette.grey[200],
        opacity: 1,
    },
}));

interface ProjectsCollabsTabProps {
    projectsFilter: 'project' | 'collaboration' | 'partnership';
    onFilterChange: (filter: 'project' | 'collaboration' | 'partnership') => void;
    // 프로젝트 관련
    projects: Project[];
    visibleProjects: Project[];
    showHiddenProjects: boolean;
    onShowHiddenProjectsChange: (show: boolean) => void;
    exitingItemIds: Set<string>;
    isProjectCreator: (project: Project) => boolean;
    canEditProject: (project: Project) => boolean;
    onProjectClick: (project: Project) => void;
    onProjectTeamChat: (e: React.MouseEvent, project: Project) => void;
    onProjectFileShare: (e: React.MouseEvent, project: Project) => void;
    onProjectStatusChange: (project: Project, status: ProjectStatus) => void;
    onProjectDelete: (project: Project) => void;
    onProjectToggleHidden: (e: React.MouseEvent, project: Project) => void;
    // 협업 관련
    collaborations: Collaboration[];
    visibleCollaborations: Collaboration[];
    showHiddenCollaborations: boolean;
    onShowHiddenCollaborationsChange: (show: boolean) => void;
    isCollaborationCreator: (collab: Collaboration) => boolean;
    canEditCollaboration: (collab: Collaboration) => boolean;
    onCollaborationClick: (collab: Collaboration) => void;
    onCollaborationTeamChat: (e: React.MouseEvent, collab: Collaboration) => void;
    onCollaborationFileShare: (e: React.MouseEvent, collab: Collaboration) => void;
    onCollaborationStatusChange: (collab: Collaboration, status: ProjectStatus) => void;
    onCollaborationDelete: (collab: Collaboration) => void;
    onCollaborationToggleHidden: (e: React.MouseEvent, collab: Collaboration) => void;
    // 파트너십 관련
    visiblePartnerships: PartnershipData[];
    showHiddenPartnership: boolean;
    onShowHiddenPartnershipChange: (show: boolean) => void;
    hiddenPartnershipIds: Set<string>;
    onPartnershipToggleHidden: (partnershipId: string) => void;
    userProfileType: string | null;
    onPartnershipStatusChange: (id: string, status: string) => void;
    onPartnershipViewDetail: (partnership: PartnershipData) => void;
    partnershipsCount: number;
}

const ARCHIVE_STATUSES = ['deleted', 'completed', 'cancelled', 'on_hold'];

export default function ProjectsCollabsTab({
    projectsFilter,
    onFilterChange,
    // 프로젝트
    projects,
    visibleProjects,
    showHiddenProjects,
    onShowHiddenProjectsChange,
    exitingItemIds,
    isProjectCreator,
    canEditProject,
    onProjectClick,
    onProjectTeamChat,
    onProjectFileShare,
    onProjectStatusChange,
    onProjectDelete,
    onProjectToggleHidden,
    // 협업
    collaborations,
    visibleCollaborations,
    showHiddenCollaborations,
    onShowHiddenCollaborationsChange,
    isCollaborationCreator,
    canEditCollaboration,
    onCollaborationClick,
    onCollaborationTeamChat,
    onCollaborationFileShare,
    onCollaborationStatusChange,
    onCollaborationDelete,
    onCollaborationToggleHidden,
    // 파트너십
    visiblePartnerships,
    showHiddenPartnership,
    onShowHiddenPartnershipChange,
    hiddenPartnershipIds,
    onPartnershipToggleHidden,
    userProfileType,
    onPartnershipStatusChange,
    onPartnershipViewDetail,
    partnershipsCount,
}: ProjectsCollabsTabProps) {
    const theme = useTheme();

    return (
        <Box>
            <TabBarBottomline<'project' | 'collaboration' | 'partnership'>
                tabs={PROJECT_FILTER_TABS}
                activeTab={projectsFilter}
                onTabChange={onFilterChange}
            />

            {projectsFilter === 'project' ? (
                // 전체 프로젝트가 0개일 때만 empty state
                projects.filter((p) => !ARCHIVE_STATUSES.includes(p.status)).length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Box
                            component="img"
                            src={ProjectIconImg}
                            alt="진행중인 프로젝트"
                            sx={{ width: 70, height: 70 }}
                        />
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>진행중인 프로젝트가 없어요</Typography>
                        <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                            다양한 프로젝트를 만들어보세요
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                    component="img"
                                    src={ProjectIconImg}
                                    alt="프로젝트"
                                    sx={{ width: 28, height: 28, mr: 0.5 }}
                                />
                                프로젝트 {visibleProjects.length}
                            </Typography>
                            <FormControlLabel
                                sx={{ gap: 0.5 }}
                                control={
                                    <NotificationSwitch
                                        checked={showHiddenProjects}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onShowHiddenProjectsChange(e.target.checked)}
                                    />
                                }
                                label={<Typography sx={{ fontSize: 10 }}>숨김 항목</Typography>}
                            />
                        </Box>

                        {visibleProjects.length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                                    {showHiddenProjects ? '숨긴 프로젝트가 없어요' : '표시할 프로젝트가 없어요 (숨김 항목 토글을 켜보세요)'}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {visibleProjects.map((project) => (
                                    <AnimatedItemCard
                                        key={project.id}
                                        isVisible={!exitingItemIds.has(project.id)}
                                    >
                                        <ItemCard
                                            item={project}
                                            type="project"
                                            isCreator={isProjectCreator(project)}
                                            canEdit={canEditProject(project)}
                                            onItemClick={() => onProjectClick(project)}
                                            onTeamChatClick={(e) => onProjectTeamChat(e, project)}
                                            onFileShareClick={(e) => onProjectFileShare(e, project)}
                                            onStatusChange={(status) => onProjectStatusChange(project, status)}
                                            onDelete={() => onProjectDelete(project)}
                                            excludeDeletedStatus={true}
                                            isHiddenInManage={(project as Project & { isHiddenInManage?: boolean }).isHiddenInManage}
                                            onToggleHidden={(e) => onProjectToggleHidden(e, project)}
                                        />
                                    </AnimatedItemCard>
                                ))}
                            </Box>
                        )}
                    </Box>
                )
            ) : projectsFilter === 'collaboration' ? (
                // 전체 협업이 0개일 때만 empty state
                collaborations.filter((c) => !ARCHIVE_STATUSES.includes(c.status)).length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Box
                            component="img"
                            src={CollaborationIconImg}
                            alt="진행중인 협업"
                            sx={{ width: 70, height: 70 }}
                        />
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>진행중인 협업이 없어요</Typography>
                        <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                            다양한 협업을 만들어보세요
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                    component="img"
                                    src={CollaborationIconImg}
                                    alt="협업"
                                    sx={{ width: 24, height: 24, mr: 0.5 }}
                                />
                                협업 {visibleCollaborations.length}
                            </Typography>
                            <FormControlLabel
                                sx={{ gap: 0.5 }}
                                control={
                                    <NotificationSwitch
                                        checked={showHiddenCollaborations}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onShowHiddenCollaborationsChange(e.target.checked)}
                                    />
                                }
                                label={<Typography sx={{ fontSize: 10 }}>숨김 항목</Typography>}
                            />
                        </Box>
                        {visibleCollaborations.length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                                    {showHiddenCollaborations ? '숨긴 협업이 없어요' : '표시할 협업이 없어요 (숨김 항목 토글을 켜보세요)'}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {visibleCollaborations.map((collab) => (
                                    <AnimatedItemCard
                                        key={collab.id}
                                        isVisible={!exitingItemIds.has(collab.id)}
                                    >
                                        <ItemCard
                                            item={collab}
                                            type="collaboration"
                                            isCreator={isCollaborationCreator(collab)}
                                            canEdit={canEditCollaboration(collab)}
                                            onItemClick={() => onCollaborationClick(collab)}
                                            onTeamChatClick={(e) => onCollaborationTeamChat(e, collab)}
                                            onFileShareClick={(e) => onCollaborationFileShare(e, collab)}
                                            onStatusChange={(status) => onCollaborationStatusChange(collab, status)}
                                            onDelete={() => onCollaborationDelete(collab)}
                                            excludeDeletedStatus={true}
                                            isHiddenInManage={(collab as Collaboration & { isHiddenInManage?: boolean }).isHiddenInManage}
                                            onToggleHidden={(e) => onCollaborationToggleHidden(e, collab)}
                                        />
                                    </AnimatedItemCard>
                                ))}
                            </Box>
                        )}
                    </Box>
                )
            ) : (
                // 파트너십 탭
                <Box sx={{ mt: 2 }}>
                    {partnershipsCount === 0 ? (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <Box
                                component="img"
                                src={PartnershipIconImg}
                                alt="문의 내역"
                                sx={{ width: 70, height: 70 }}
                            />
                            <Typography sx={{ fontWeight: 600, mb: 1 }}>문의 내역이 없어요.</Typography>
                            <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                                다양한 파트너십 문의를 받아보세요.
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography
                                    sx={{
                                        fontSize: 16,
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={PartnershipIconImg}
                                        alt="파트너십"
                                        sx={{ width: 22, height: 22, mr: 0.5 }}
                                    />
                                    {userProfileType === 'brand'
                                        ? `파트너십 답변 ${visiblePartnerships.length}`
                                        : `파트너십 문의 ${visiblePartnerships.length}`}
                                </Typography>
                                <FormControlLabel
                                    sx={{ gap: 0.5 }}
                                    control={
                                        <NotificationSwitch
                                            checked={showHiddenPartnership}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                onShowHiddenPartnershipChange(e.target.checked)
                                            }
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: 10 }}>숨김 항목</Typography>}
                                />
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {visiblePartnerships.length === 0 ? (
                                    <Box sx={{ py: 4, textAlign: 'center' }}>
                                        <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                                            {showHiddenPartnership ? '숨긴 문의 내역이 없어요' : '표시할 문의 내역이 없어요 (숨김 항목 토글을 켜보세요)'}
                                        </Typography>
                                    </Box>
                                ) : (
                                    visiblePartnerships.map((partnership: PartnershipData) => (
                                        <PartnershipCard
                                            key={partnership.id}
                                            data={partnership}
                                            mode={userProfileType === 'brand' ? 'received' : 'sent'}
                                            onStatusChange={onPartnershipStatusChange}
                                            onViewDetail={() => onPartnershipViewDetail(partnership)}
                                            isHidden={hiddenPartnershipIds.has(partnership.id)}
                                            onToggleHidden={() => onPartnershipToggleHidden(partnership.id)}
                                        />
                                    ))
                                )}
                            </Box>
                        </>
                    )}
                </Box>
            )}
        </Box>
    );
}
