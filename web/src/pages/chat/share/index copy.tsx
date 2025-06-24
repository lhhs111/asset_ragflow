import { ReactComponent as ChatAppCube } from '@/assets/svg/chat-app-cube.svg';
import RenameModal from '@/components/rename-modal';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  Avatar,
  Button,
  Card,
  Divider,
  Dropdown,
  Flex,
  MenuProps,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { MenuItemProps } from 'antd/lib/menu/MenuItem';
import classNames from 'classnames';
import { useCallback, useState } from 'react';
import {
  useDeleteConversation,
  usePersionalDeleteConversation,
  useDeleteDialog,
  useEditDialog,
  useHandleItemHover,
  useRenameConversation,
  usePersonalRenameConversation,
  // useSelectDerivedConversationList,
} from '../hooks';

import SvgIcon from '@/components/svg-icon';
import { useTheme } from '@/components/theme-provider';

import { useTranslate } from '@/hooks/common-hooks';

import { getApiKey } from '../utils';

const { Text } = Typography;

import React, { forwardRef, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate  } from 'umi';



// -------------------------------------------------

import ChatContainer from './large';

import styles from './index.less';

const SharedChat = () => {
  
  const navigate = useNavigate()

  const urlParams = new URLSearchParams(window.location.search);
  const user_id = urlParams.get('user_id'); // 获取名为user_id的参数值
  const shared_id = urlParams.get('shared_id'); // 获取名为shared_id的参数值

  const [searchParams] = useSearchParams()
  const [conversationList, setConversationList] = useState<any[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [selectedConversation, setSelectedConversation] = useState<any>({});
  const getSessionList = async () => {
    const id = searchParams.get('auth')
    const url = `/api/v1/chats/${shared_id}/sessions?page=1&size=100&user_id=${user_id}`
    await axios.get(url,{
      headers: {
        'Authorization': `Bearer ${getApiKey()}`
      },
    })
    .then(response => {
      // 处理返回的数据
      const newConversations = response.data.data;
      setConversationList(newConversations);
      if (newConversations.length > 0) {
        newConversations.forEach((item: any) => {
          item['reference'] = [];
          if (item.messages?.length > 1) {
            item.messages.map((message: any, index: number) => {
              if (message.role === 'assistant' && index > 1) {
                if (message.reference?.length > 0)  {
                  item.reference.push({
                    chunks: message.reference || [],
                    doc_aggs: [ { doc_id: message.reference[0].document_id, doc_name:message.reference[0].document_name } ]
                  })
                  message.reference = null
                } else {
                  item.reference.push({
                    chunks: []
                  })
                }
              }
            })
          }
        })
        
        const firstId = newConversations[0].id;
        setConversationId(firstId);
        setSelectedMessages(newConversations[0].messages || []);
        setSelectedConversation(newConversations[0]);

        // ✅ 添加 id 到 URL 查询参数中
        const search = new URLSearchParams(searchParams);
        search.set('id', firstId);

        // 使用 navigate 替换当前路径，保留原有参数
        navigate(`?${search.toString()}`, { replace: true });
      }
    })
    .catch(error => {
      setConversationList([]);
      // 处理错误
    });
  }
  React.useEffect(() => {
    // 在这里调用你的函数
    console.log('组件已挂载');
    getSessionList();
    
    // 返回的函数将在组件卸载时调用
    return () => {
      console.log('组件即将卸载');
    };
  }, []); // 空依赖数组意味着这个effect只在组件挂载时运行一次
  const { onRemoveConversation } = usePersionalDeleteConversation();
  const { theme } = useTheme();
  const {
    activated: conversationActivated,
    handleItemEnter: handleConversationItemEnter,
    handleItemLeave: handleConversationItemLeave,
  } = useHandleItemHover();
  const {
    conversationRenameLoading,
    initialConversationName,
    onConversationRenameOk,
    conversationRenameVisible,
    hideConversationRenameModal,
    showConversationRenameModal,
  } = usePersonalRenameConversation();

  const { t } = useTranslate('chat');
  const [controller, setController] = useState(new AbortController());

  const handleConversationCardEnter = (id: string) => () => {
    handleConversationItemEnter(id);
  };
  const handleRemoveConversation =
    (conversationId: string): MenuItemProps['onClick'] =>
   async ({ domEvent }) => {
      domEvent.preventDefault();
      domEvent.stopPropagation();
      await onRemoveConversation([conversationId]);
      getSessionList();
    };

  const handleShowConversationRenameModal =
    (conversation: any): MenuItemProps['onClick'] =>
    ({ domEvent }) => {
      domEvent.preventDefault();
      domEvent.stopPropagation();
      showConversationRenameModal(conversation);
    };

  const handleConversationCardClick = useCallback(
    (conversationId: string, isNew: boolean) => async () => {
      await getSessionList();
      setConversationId(conversationId)
      let messages = conversationList.find(item => item.id === conversationId) || {messages: []}
      // ✅ 添加 id 到 URL 查询参数中
      const search = new URLSearchParams(searchParams);
      search.set('id', messages.id);

      // 使用 navigate 替换当前路径，保留原有参数
      navigate(`?${search.toString()}`, { replace: true });

      setSelectedMessages(messages.messages);
      setSelectedConversation(messages);
      setController((pre) => {
        pre.abort();
        return new AbortController();
      });
    },
    [conversationList]
  );

  const handleCreateTemporaryConversation = useCallback(() => {
    // addTemporaryConversation();
    const url = `/api/v1/chats/${shared_id}/sessions`
    axios.post(url,{
        user_id: user_id,
        name: '新对话' + conversationList.length
      }, {
      headers: {
        'Authorization': `Bearer ${getApiKey()}`
      },
    })
    .then(response => {
      // 处理返回的数据
      setConversationList([response.data.data, ...conversationList]); // 添加新元素到数组末尾
      setSelectedMessages(response.data.data.messages || []);
      setSelectedConversation({messages: []});
      setConversationId(response.data.data.id);
    })
    .catch(error => {
      // 处理错误
    });
  }, [conversationList]);


  const buildConversationItems = (conversation: any) => {
    const appItems: MenuProps['items'] = [
      {
        key: '1',
        onClick: handleShowConversationRenameModal(conversation),
        label: (
          <Space>
            <EditOutlined />
            {t('rename', { keyPrefix: 'common' })}
          </Space>
        ),
      },
      { type: 'divider' },
      {
        key: '2',
        onClick: handleRemoveConversation(conversation.id),
        label: (
          <Space>
            <DeleteOutlined />
            {t('delete', { keyPrefix: 'common' })}
          </Space>
        ),
      },
    ];

    return appItems;
  };


// -------------------------------------------------
  return (
    <div className={styles.chatWrapper}>
      <Flex className={styles.chatTitleWrapper}>
        <Flex flex={1} vertical>
          <Flex
            justify={'space-between'}
            align="center"
            className={styles.chatTitle}
          >
            <Space>
              <b>{t('chat')}</b>
              <Tag>{conversationList.length || 0}</Tag>
            </Space>
            <Tooltip title={t('newChat')}>
              <div>
                <SvgIcon
                  name="plus-circle-fill"
                  width={20}
                  onClick={handleCreateTemporaryConversation}
                ></SvgIcon>
              </div>
            </Tooltip>
          </Flex>
          <Divider></Divider>
          <Flex vertical gap={10} className={styles.chatTitleContent}>
            {/* <Spin
              spinning={conversationLoading}
              wrapperClassName={styles.chatSpin}
            > */}
              {conversationList.map((x) => (
                <Card
                  key={x.id}
                  hoverable
                  onClick={handleConversationCardClick(x.id, x.is_new)}
                  onMouseEnter={handleConversationCardEnter(x.id)}
                  onMouseLeave={handleConversationItemLeave}
                  className={classNames(styles.chatTitleCard, {
                    [theme === 'dark'
                      ? styles.chatTitleCardSelectedDark
                      : styles.chatTitleCardSelected]: x.id === conversationId,
                  })}
                >
                  <Flex justify="space-between" align="center">
                    <div>
                      <Text
                        ellipsis={{ tooltip: x.name }}
                        style={{ width: 150 }}
                      >
                        {x.name}
                      </Text>
                    </div>
                    {conversationActivated === x.id &&
                      x.id !== '' &&
                      !x.is_new && (
                        <section>
                          <Dropdown
                            menu={{ items: buildConversationItems(x) }}
                          >
                            <ChatAppCube
                              className={styles.cubeIcon}
                            ></ChatAppCube>
                          </Dropdown>
                        </section>
                      )}
                  </Flex>
                </Card>
              ))}
            {/* </Spin> */}
          </Flex>
        </Flex>
      </Flex>
      <ChatContainer messages={selectedMessages} conversation={selectedConversation}></ChatContainer>
      <RenameModal
        visible={conversationRenameVisible}
        hideModal={hideConversationRenameModal}
        onOk={ 
          async (newName) =>{
            await onConversationRenameOk(newName)
            getSessionList();
          }
        }
        initialName={initialConversationName}
        loading={false}
      ></RenameModal>
    </div>
  );
};

export default SharedChat;
