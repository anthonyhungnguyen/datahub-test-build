import React, { useCallback, useEffect, useState } from 'react';
import * as QueryString from 'query-string';
import { Input, Button, Form, message, Image, Divider } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useReactiveVar } from '@apollo/client';
import styled, { useTheme } from 'styled-components/macro';
import { Redirect, useLocation } from 'react-router';
import styles from './login.module.css';
import { Message } from '../shared/Message';
import { isLoggedInVar, checkAuthStatus } from './checkAuthStatus';
import analytics, { EventType } from '../analytics';
import { useAppConfig } from '../useAppConfig';

type FormValues = {
    username: string;
    password: string;
};

const FormInput = styled(Input)`
    &&& {
        height: 32px;
        font-size: 12px;
        border: 1px solid #555555;
        border-radius: 5px;
        background-color: transparent;
        color: white;
        line-height: 1.5715;
    }
    > .ant-input {
        color: white;
        font-size: 14px;
        background-color: transparent;
    }
    > .ant-input:hover {
        color: white;
        font-size: 14px;
        background-color: transparent;
    }
`;

const SsoDivider = styled(Divider)`
    background-color: white;
`;

const SsoButton = styled(Button)`
    &&& {
        align-self: center;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 5.6px 11px;
        gap: 4px;
    }
`;

const LoginLogo = styled(LoginOutlined)`
    padding-top: 7px;
`;

const SsoTextSpan = styled.span`
    padding-top: 6px;
`;

const redirectSSO = async () => {
    const requestOptions = {
        method: 'GET',
    };
    await fetch('/getRedirectUri', requestOptions).then(async (response) => {
        const data = await response.text();
        if (!response.ok) {
            const error = data || response.status;
            return Promise.reject(error);
        }
        window.location.href = data;
        return Promise.resolve();
    });
};

export type LogInProps = Record<string, never>;

export const LogIn: React.VFC<LogInProps> = () => {
    const isLoggedIn = useReactiveVar(isLoggedInVar);
    const location = useLocation();
    const params = QueryString.parse(location.search);
    const maybeRedirectError = params.error_msg;

    const themeConfig = useTheme();
    const [loading, setLoading] = useState(false);

    const { refreshContext } = useAppConfig();

    const redirectUri = params.redirect_uri;
    useEffect(() => {
        if (redirectUri) {
            const code = redirectUri.toString().split('=')[1];
            if (code) {
                setLoading(true);
                const requestOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ authorization_code: code }),
                };

                fetch('/loginBySSO', requestOptions)
                    .then(async (response) => {
                        const data = await response.json();
                        if (!data.ok) {
                            const error = data.status;
                            return Promise.reject(error);
                        }
                        isLoggedInVar(true);
                        refreshContext()
                        analytics.event({ type: EventType.LogInEvent });
                        // Reload window
                        window.location.reload();
                        return Promise.resolve();
                    })
                    .catch((e) => {
                        console.error('Failed to log in! An unexpected error occurred.', e);
                    })
                    .finally(() => {
                        setLoading(false)
                    });
            }
        }
    }, [redirectUri, refreshContext]);

    if (isLoggedIn) {
        const maybeRedirectUri = params.redirect_uri;
        console.log('maybeRedirectUri', maybeRedirectUri);
        return <Redirect to={(maybeRedirectUri && decodeURIComponent(maybeRedirectUri as string)) || '/'} />;
    }

    return (
        <div className={styles.login_page}>
            {maybeRedirectError && maybeRedirectError.length > 0 && (
                <Message type="error" content={maybeRedirectError} />
            )}
            <div className={styles.login_box}>
                <div className={styles.login_logo_box}>
                    <Image wrapperClassName={styles.logo_image} src={themeConfig.assets?.logoUrl} preview={false} />
                </div>
                <div className={styles.login_form_box}>
                    {loading && <Message type="loading" content="Logging in..." />}
                    <SsoButton
                        type="primary"
                        onClick={redirectSSO}
                        block
                        htmlType="submit"
                        className={styles.sso_button}
                    >
                        <LoginLogo />
                        <SsoTextSpan>Sign in with GHN</SsoTextSpan>
                        <span />
                    </SsoButton>
                </div>
            </div>
        </div>
    );
};
