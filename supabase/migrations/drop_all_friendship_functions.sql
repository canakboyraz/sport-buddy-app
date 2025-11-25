-- Drop all existing friendship functions with all possible signatures

-- Get all function signatures and drop them
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname IN (
            'send_friend_request',
            'accept_friend_request',
            'reject_friend_request',
            'remove_friend',
            'get_friendship_status'
        )
        AND n.nspname = 'public'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
            func_record.schema_name,
            func_record.function_name,
            func_record.args
        );
        RAISE NOTICE 'Dropped function: %.%(%)',
            func_record.schema_name,
            func_record.function_name,
            func_record.args;
    END LOOP;
END $$;
