import json
import os
import random
from datetime import datetime, timedelta
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Авторизация пользователей по телефону с SMS-кодом
    Args: event с httpMethod, body; context с request_id
    Returns: HTTP response с токеном или кодом подтверждения
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database not configured'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    action = body_data.get('action')
    
    conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    
    if action == 'send_code':
        phone = body_data.get('phone', '').strip()
        name = body_data.get('name', '').strip()
        
        if not phone:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Phone number required'})
            }
        
        code = str(random.randint(100000, 999999))
        expires_at = datetime.now() + timedelta(minutes=5)
        
        cur.execute('SELECT id, name FROM users WHERE phone = %s', (phone,))
        user = cur.fetchone()
        
        if user:
            cur.execute('''
                UPDATE users 
                SET verification_code = %s, code_expires_at = %s
                WHERE phone = %s
            ''', (code, expires_at, phone))
        else:
            user_name = name if name else f'User {phone[-4:]}'
            user_email = f'user_{phone.replace("+", "").replace(" ", "")}@voting.app'
            cur.execute('''
                INSERT INTO users (phone, name, email, verification_code, code_expires_at, role, is_verified)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (phone, user_name, user_email, code, expires_at, 'user', False))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'success': True,
                'code': code,
                'message': f'Code sent to {phone}'
            })
        }
    
    if action == 'verify_code':
        phone = body_data.get('phone', '').strip()
        code = body_data.get('code', '').strip()
        
        if not phone or not code:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Phone and code required'})
            }
        
        cur.execute('''
            SELECT id, name, email, role, verification_code, code_expires_at
            FROM users
            WHERE phone = %s
        ''', (phone,))
        user = cur.fetchone()
        
        if not user:
            cur.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User not found'})
            }
        
        if user['verification_code'] != code:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid code'})
            }
        
        if datetime.now() > user['code_expires_at']:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Code expired'})
            }
        
        cur.execute('''
            UPDATE users 
            SET is_verified = TRUE, last_login = %s, verification_code = NULL
            WHERE id = %s
        ''', (datetime.now(), user['id']))
        conn.commit()
        cur.close()
        conn.close()
        
        token = f"user_{user['id']}_token"
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'success': True,
                'token': token,
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'role': user['role'],
                    'phone': phone
                }
            })
        }
    
    cur.close()
    conn.close()
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'})
    }