import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление голосованиями - создание, удаление (только для owner)
    Args: event с httpMethod, body, headers; context с request_id
    Returns: HTTP response с результатом операции
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Role',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('X-User-Id') or headers.get('x-user-id')
    user_role = headers.get('X-User-Role') or headers.get('x-user-role')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'})
        }
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database not configured'})
        }
    
    conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        title = body_data.get('title', '').strip()
        description = body_data.get('description', '').strip()
        options = body_data.get('options', [])
        
        if not title or not options or len(options) < 2:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Title and at least 2 options required'})
            }
        
        cur.execute('''
            INSERT INTO polls (title, description, created_by, status)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        ''', (title, description, int(user_id), 'active'))
        
        poll_id = cur.fetchone()['id']
        
        for option_text in options:
            if option_text.strip():
                cur.execute('''
                    INSERT INTO poll_options (poll_id, option_text, votes_count)
                    VALUES (%s, %s, %s)
                ''', (poll_id, option_text.strip(), 0))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'success': True,
                'poll_id': poll_id,
                'message': 'Poll created successfully'
            })
        }
    
    if method == 'PUT':
        if user_role != 'owner':
            cur.close()
            conn.close()
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Only owner can change poll status'})
            }
        
        body_data = json.loads(event.get('body', '{}'))
        poll_id = body_data.get('poll_id')
        new_status = body_data.get('status')
        
        if not poll_id or not new_status:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'poll_id and status required'})
            }
        
        if new_status not in ['active', 'closed']:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid status. Use active or closed'})
            }
        
        cur.execute('UPDATE polls SET status = %s WHERE id = %s', (new_status, poll_id))
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'success': True,
                'message': f'Poll status changed to {new_status}'
            })
        }
    
    if method == 'DELETE':
        if user_role != 'owner':
            cur.close()
            conn.close()
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Only owner can delete polls'})
            }
        
        body_data = json.loads(event.get('body', '{}'))
        poll_id = body_data.get('poll_id')
        
        if not poll_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'poll_id required'})
            }
        
        cur.execute('DELETE FROM votes WHERE poll_id = %s', (poll_id,))
        cur.execute('DELETE FROM poll_options WHERE poll_id = %s', (poll_id,))
        cur.execute('DELETE FROM polls WHERE id = %s', (poll_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({
                'success': True,
                'message': 'Poll deleted successfully'
            })
        }
    
    cur.close()
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }