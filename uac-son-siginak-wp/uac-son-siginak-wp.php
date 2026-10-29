<?php
/**
 * Plugin Name: UAC Son Sığınak WP
 * Description: UltiAtomCore için temiz, modüler, görselli ve performans odaklı 2D hayatta kalma oyunu. Shortcode: [uac_son_siginak] veya [uac_son_siginak_wp]
 * Version: 5.4.0
 * Author: ultiatomcore.com
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'UACSSWP_VERSION', '5.4.0' );
define( 'UACSSWP_FIRST_BOSS_TIME', 80 );
define( 'UACSSWP_BOSS_INTERVAL', 45 );
define( 'UACSSWP_FILE', __FILE__ );
define( 'UACSSWP_DIR', plugin_dir_path( __FILE__ ) );
define( 'UACSSWP_URL', plugin_dir_url( __FILE__ ) );

function uacsswp_real_ip() {
    if ( function_exists( 'uac_get_real_ip' ) ) return uac_get_real_ip();
    $headers = [ 'HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR' ];
    foreach ( $headers as $h ) {
        if ( ! empty( $_SERVER[ $h ] ) ) {
            $ip = trim( explode( ',', sanitize_text_field( wp_unslash( $_SERVER[ $h ] ) ) )[0] );
            if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) return $ip;
        }
    }
    return '0.0.0.0';
}

function uacsswp_error( $message, $code = 'error', $status = 400, $extra = [] ) {
    if ( function_exists( 'uac_json_error' ) ) return uac_json_error( $message, $code, $status, $extra );
    return new WP_REST_Response( array_merge( [ 'ok' => false, 'code' => $code, 'message' => $message ], $extra ), $status );
}

function uacsswp_public_permission() { return true; }

function uacsswp_is_banned( $ip ) {
    return function_exists( 'uac_is_banned' ) ? uac_is_banned( $ip ) : false;
}

function uacsswp_rate_limit( $ip, $action ) {
    $cfgs = [
        'start' => [ 'limit' => 18, 'window' => 60 ],
        'score' => [ 'limit' => 12, 'window' => 60 ],
        'list'  => [ 'limit' => 60, 'window' => 60 ],
    ];
    $cfg = $cfgs[ $action ] ?? [ 'limit' => 20, 'window' => 60 ];
    $key = 'uacsswp_rate_' . sanitize_key( $action ) . '_' . md5( $ip );
    $data = get_transient( $key );
    if ( ! is_array( $data ) || time() - (int) ( $data['first'] ?? 0 ) > $cfg['window'] ) {
        $data = [ 'count' => 0, 'first' => time() ];
    }
    $data['count']++;
    set_transient( $key, $data, $cfg['window'] );
    if ( $data['count'] > $cfg['limit'] ) {
        return [ 'blocked' => true, 'retry_after' => max( 1, $cfg['window'] - ( time() - (int) $data['first'] ) ) ];
    }
    return [ 'blocked' => false ];
}

function uacsswp_validate_name( $name ) {
    $name = trim( sanitize_text_field( (string) $name ) );
    if ( $name === '' ) $name = 'Misafir';
    if ( function_exists( 'uac_validate_name' ) ) {
        return uac_validate_name( $name, 20 );
    }
    if ( mb_strlen( $name, 'UTF-8' ) < 2 || mb_strlen( $name, 'UTF-8' ) > 20 ) return [ false, 'İsim 2-20 karakter olmalıdır.' ];
    $raw = mb_strtolower( $name, 'UTF-8' );
    foreach ( [ 'admin', 'adm1n', '4dmin', 'yonetici', 'yönetici', 'moderator', 'kurucu', 'ultiatom', 'atomcore' ] as $sub ) {
        if ( mb_strpos( $raw, $sub, 0, 'UTF-8' ) !== false && ! current_user_can( 'manage_options' ) ) {
            return [ false, 'Bu isim veya "admin/yönetici" içeren isimler sadece site yöneticisine (Admin) aittir.' ];
        }
    }
    if ( function_exists( 'uac_contains_bad_words' ) && uac_contains_bad_words( $name ) ) return [ false, 'Uygunsuz kelime tespit edildi.' ];
    return [ true, $name ];
}

function uacsswp_normalize_player_base( $name ) {
    $name = mb_strtolower( trim( (string) $name ), 'UTF-8' );
    $name = preg_replace( '/\s+/u', ' ', $name );
    return sanitize_key( $name );
}

function uacsswp_validate_player_key( $key ) {
    $key = sanitize_text_field( (string) $key );
    if ( strlen( $key ) < 16 || strlen( $key ) > 120 ) return false;
    return $key;
}

function uacsswp_tag_for_owner( $base, $owner_hash, $claims ) {
    $raw = strtoupper( substr( preg_replace( '/[^A-Z0-9]/', '', wp_hash( $base . '|' . $owner_hash . '|' . wp_salt() ) ), 0, 4 ) );
    if ( strlen( $raw ) < 4 ) $raw = strtoupper( substr( md5( $base . $owner_hash ), 0, 4 ) );
    $used = [];
    foreach ( $claims as $claim ) if ( ! empty( $claim['tag'] ) ) $used[] = $claim['tag'];
    $tag = $raw;
    $i = 1;
    while ( in_array( $tag, $used, true ) ) {
        $tag = strtoupper( substr( md5( $raw . $i ), 0, 4 ) );
        $i++;
    }
    return $tag;
}

function uacsswp_resolve_identity( $display_name, $player_key ) {
    $base_key = uacsswp_normalize_player_base( $display_name );
    $owner_hash = hash( 'sha256', $player_key . wp_salt( 'auth' ) );
    $all = get_option( 'uacsswp_name_claims_v2', [] );
    if ( ! is_array( $all ) ) $all = [];
    if ( empty( $all[ $base_key ] ) || ! is_array( $all[ $base_key ] ) ) $all[ $base_key ] = [];
    if ( empty( $all[ $base_key ][ $owner_hash ] ) ) {
        $tag = uacsswp_tag_for_owner( $base_key, $owner_hash, $all[ $base_key ] );
        $all[ $base_key ][ $owner_hash ] = [
            'display' => $display_name,
            'tag' => $tag,
            'created' => current_time( 'mysql' ),
            'last_seen' => current_time( 'mysql' ),
        ];
    } else {
        $all[ $base_key ][ $owner_hash ]['display'] = $display_name;
        $all[ $base_key ][ $owner_hash ]['last_seen'] = current_time( 'mysql' );
        $tag = $all[ $base_key ][ $owner_hash ]['tag'];
    }
    update_option( 'uacsswp_name_claims_v2', $all, false );
    $tag = sanitize_text_field( $all[ $base_key ][ $owner_hash ]['tag'] );
    return [
        'base' => $display_name,
        'tag' => $tag,
        'identity' => $display_name . '#' . $tag,
        'owner_hash' => $owner_hash,
    ];
}

function uacsswp_profile_key( $owner_hash ) {
    $clean = substr( preg_replace( '/[^a-f0-9]/i', '', (string) $owner_hash ), 0, 64 );
    if ( strlen( $clean ) < 16 ) $clean = substr( hash( 'sha256', (string) $owner_hash ), 0, 64 );
    return 'uacsswp_profile_v3_' . strtolower( $clean );
}

function uacsswp_board_key( $period ) {
    if ( $period === 'day' ) return 'uacsswp_leaderboard_day_' . gmdate( 'Ymd' );
    if ( $period === 'week' ) return 'uacsswp_leaderboard_week_' . gmdate( 'oW' );
    return 'uacsswp_leaderboard_all';
}

function uacsswp_save_to_board( $key, $entry, $limit = 100 ) {
    $board = get_option( $key, [] );
    if ( ! is_array( $board ) ) $board = [];

    
    $entry_key = ! empty( $entry['owner_hash'] )
        ? 'p_' . substr( preg_replace( '/[^a-f0-9]/i', '', (string) $entry['owner_hash'] ), 0, 48 )
        : sanitize_key( mb_strtolower( $entry['name'], 'UTF-8' ) );

    if ( ! isset( $board[ $entry_key ] ) || (int) $entry['score'] > (int) ( $board[ $entry_key ]['score'] ?? 0 ) ) {
        $board[ $entry_key ] = $entry;
    }
    uasort( $board, function( $a, $b ) {
        $score = (int) ( $b['score'] ?? 0 ) <=> (int) ( $a['score'] ?? 0 );
        if ( $score !== 0 ) return $score;
        return (int) ( $b['duration'] ?? 0 ) <=> (int) ( $a['duration'] ?? 0 );
    } );
    update_option( $key, array_slice( $board, 0, $limit, true ), false );
}

add_action( 'rest_api_init', function () {
    register_rest_route( 'uac-son-siginak/wp', '/session-start', [
        'methods' => 'POST',
        'callback' => 'uacsswp_session_start',
        'permission_callback' => 'uacsswp_public_permission',
    ] );
    register_rest_route( 'uac-son-siginak/wp', '/score-save', [
        'methods' => 'POST',
        'callback' => 'uacsswp_score_save',
        'permission_callback' => 'uacsswp_public_permission',
    ] );
    register_rest_route( 'uac-son-siginak/wp', '/leaderboard', [
        'methods' => 'GET',
        'callback' => 'uacsswp_leaderboard',
        'permission_callback' => 'uacsswp_public_permission',
    ] );
    register_rest_route( 'uac-son-siginak/wp', '/profile', [
        'methods' => 'GET',
        'callback' => 'uacsswp_profile',
        'permission_callback' => 'uacsswp_public_permission',
    ] );
} );

function uacsswp_session_start( WP_REST_Request $request ) {
    $ip = uacsswp_real_ip();
    if ( uacsswp_is_banned( $ip ) ) return uacsswp_error( 'Erişiminiz engellenmiştir.', 'banned', 403 );
    $rate = uacsswp_rate_limit( $ip, 'start' );
    if ( ! empty( $rate['blocked'] ) ) return uacsswp_error( 'Çok fazla oyun başlatıldı.', 'rate_limited', 429, [ 'retry_after' => $rate['retry_after'] ] );

    [ $valid, $name_or_msg ] = uacsswp_validate_name( $request->get_param( 'name' ) );
    if ( ! $valid ) return uacsswp_error( $name_or_msg, 'invalid_name', 400 );
    $player_key = uacsswp_validate_player_key( $request->get_param( 'player_key' ) );
    if ( ! $player_key ) return uacsswp_error( 'Oyuncu kimliği oluşturulamadı. Tarayıcı depolamasını kontrol edin.', 'invalid_player_key', 400 );
    $identity = uacsswp_resolve_identity( $name_or_msg, $player_key );

    $token = wp_generate_password( 48, false, false );
    set_transient( 'uacsswp_session_' . hash( 'sha256', $token ), [
        'ip' => $ip,
        'name' => $identity['identity'],
        'base_name' => $identity['base'],
        'tag' => $identity['tag'],
        'owner_hash' => $identity['owner_hash'],
        'started' => time(),
        'used' => false,
    ], 3 * HOUR_IN_SECONDS );

    return rest_ensure_response( [ 'ok' => true, 'session' => $token, 'identity' => $identity['identity'], 'base_name' => $identity['base'], 'tag' => $identity['tag'] ] );
}

function uacsswp_score_save( WP_REST_Request $request ) {
    $ip = uacsswp_real_ip();
    if ( uacsswp_is_banned( $ip ) ) return uacsswp_error( 'Erişiminiz engellenmiştir.', 'banned', 403 );
    $rate = uacsswp_rate_limit( $ip, 'score' );
    if ( ! empty( $rate['blocked'] ) ) return uacsswp_error( 'Çok fazla skor isteği gönderdiniz.', 'rate_limited', 429, [ 'retry_after' => $rate['retry_after'] ] );

    $name = sanitize_text_field( (string) $request->get_param( 'name' ) );
    $player_key = uacsswp_validate_player_key( $request->get_param( 'player_key' ) );
    if ( ! $player_key ) return uacsswp_error( 'Geçersiz oyuncu kimliği.', 'invalid_player_key', 400 );
    $owner_hash = hash( 'sha256', $player_key . wp_salt( 'auth' ) );
    $session = sanitize_text_field( $request->get_param( 'session' ) );
    $session_key = 'uacsswp_session_' . hash( 'sha256', $session );
    $session_data = get_transient( $session_key );
    if ( ! is_array( $session_data ) || ! empty( $session_data['used'] ) || ! hash_equals( (string) $session_data['name'], (string) $name ) || ! hash_equals( (string) $session_data['owner_hash'], (string) $owner_hash ) ) {
        return uacsswp_error( 'Geçersiz oyun oturumu.', 'invalid_session', 400 );
    }
    $duration = max( 0, min( 7200, (int) $request->get_param( 'duration' ) ) );
    $kills    = max( 0, min( 50000, (int) $request->get_param( 'kills' ) ) );
    $bosses   = max( 0, min( 1000, (int) $request->get_param( 'bosses' ) ) );
    $chests   = max( 0, min( 2000, (int) $request->get_param( 'chests' ) ) );
    $level    = max( 1, min( 1000, (int) $request->get_param( 'level' ) ) );
    $score    = max( 0, min( 999999999, (int) $request->get_param( 'score' ) ) );
    $character = sanitize_text_field( $request->get_param( 'character' ) ?: 'Hayatta Kalan' );
    $achievements = $request->get_param( 'achievements' );
    if ( ! is_array( $achievements ) ) $achievements = [];
    $achievements = array_slice( array_unique( array_map( 'sanitize_key', $achievements ) ), 0, 50 );

    $server_elapsed = time() - (int) $session_data['started'];
    if ( $duration < 2 || $score < 1 ) return uacsswp_error( 'Geçersiz oyun verisi.', 'invalid_game_data', 400 );
    if ( $server_elapsed < 2 || $duration > $server_elapsed + 25 ) return uacsswp_error( 'Geçersiz oyun süresi.', 'invalid_time', 400 );

    $boss_max = $duration < UACSSWP_FIRST_BOSS_TIME ? 0 : 1 + (int) floor( max( 0, $duration - UACSSWP_FIRST_BOSS_TIME ) / UACSSWP_BOSS_INTERVAL ) + 2;
    if ( $bosses > $boss_max ) return uacsswp_error( 'Geçersiz boss verisi.', 'invalid_boss_data', 400 );
    if ( $kills > max( 40, $duration * 8 ) ) return uacsswp_error( 'Geçersiz düşman verisi.', 'invalid_kill_data', 400 );

    $expected = ( $duration * 10 ) + ( $kills * 14 ) + ( $bosses * 260 ) + ( $chests * 35 ) + ( $level * 60 );
    if ( abs( $score - $expected ) > max( 80, (int) round( $expected * 0.16 ) ) ) {
        return uacsswp_error( 'Skor doğrulaması başarısız.', 'invalid_score', 400 );
    }

    $session_data['used'] = true;
    set_transient( $session_key, $session_data, 5 * MINUTE_IN_SECONDS );

    $now = current_time( 'mysql' );
    $entry = [
        'name' => $name,
        'base_name' => sanitize_text_field( $session_data['base_name'] ?? $name ),
        'tag' => sanitize_text_field( $session_data['tag'] ?? '' ),
        'owner_hash' => $owner_hash,
        'score' => $score,
        'duration' => $duration,
        'kills' => $kills,
        'bosses' => $bosses,
        'chests' => $chests,
        'level' => $level,
        'character' => $character,
        'date' => $now,
    ];

    uacsswp_save_to_board( uacsswp_board_key( 'all' ), $entry );
    uacsswp_save_to_board( uacsswp_board_key( 'week' ), $entry );
    uacsswp_save_to_board( uacsswp_board_key( 'day' ), $entry );

    $profile_key = uacsswp_profile_key( $owner_hash );
    $profile = get_option( $profile_key, [ 'name' => $name, 'base_name' => sanitize_text_field( $session_data['base_name'] ?? $name ), 'games' => 0, 'total_score' => 0, 'best_score' => 0, 'best_duration' => 0, 'total_kills' => 0, 'total_bosses' => 0, 'total_chests' => 0, 'achievements' => [], 'last_played' => $now ] );
    if ( ! is_array( $profile ) ) $profile = [ 'name' => $name, 'games' => 0, 'total_score' => 0, 'best_score' => 0, 'best_duration' => 0, 'total_kills' => 0, 'total_bosses' => 0, 'total_chests' => 0, 'achievements' => [], 'last_played' => $now ];
    $profile['games'] = (int) $profile['games'] + 1;
    $profile['total_score'] = (int) $profile['total_score'] + $score;
    $profile['best_score'] = max( (int) $profile['best_score'], $score );
    $profile['best_duration'] = max( (int) $profile['best_duration'], $duration );
    $profile['base_name'] = sanitize_text_field( $session_data['base_name'] ?? $name );
    $profile['total_kills'] = (int) ( $profile['total_kills'] ?? 0 ) + $kills;
    $profile['total_bosses'] = (int) ( $profile['total_bosses'] ?? 0 ) + $bosses;
    $profile['total_chests'] = (int) ( $profile['total_chests'] ?? 0 ) + $chests;
    $profile['achievements'] = array_values( array_unique( array_merge( is_array( $profile['achievements'] ?? null ) ? $profile['achievements'] : [], $achievements ) ) );
    $profile['last_played'] = $now;
    update_option( $profile_key, $profile, false );

    return rest_ensure_response( [ 'ok' => true, 'best_score' => $profile['best_score'], 'best_duration' => $profile['best_duration'], 'achievement_count' => count( $profile['achievements'] ?? [] ) ] );
}

function uacsswp_leaderboard( WP_REST_Request $request ) {
    $ip = uacsswp_real_ip();
    $rate = uacsswp_rate_limit( $ip, 'list' );
    if ( ! empty( $rate['blocked'] ) ) return uacsswp_error( 'Çok fazla istek.', 'rate_limited', 429, [ 'retry_after' => $rate['retry_after'] ] );

    $period = sanitize_key( $request->get_param( 'period' ) ?: 'all' );
    if ( ! in_array( $period, [ 'all', 'week', 'day' ], true ) ) $period = 'all';
    $limit = min( 50, max( 1, (int) ( $request->get_param( 'limit' ) ?: 10 ) ) );
    $board = get_option( uacsswp_board_key( $period ), [] );
    if ( ! is_array( $board ) ) $board = [];
    uasort( $board, function( $a, $b ) {
        $score = (int) ( $b['score'] ?? 0 ) <=> (int) ( $a['score'] ?? 0 );
        if ( $score !== 0 ) return $score;
        return (int) ( $b['duration'] ?? 0 ) <=> (int) ( $a['duration'] ?? 0 );
    } );
    $entries = [];
    $rank = 1;
    foreach ( array_slice( $board, 0, $limit, true ) as $entry ) {
        $entries[] = [
            'rank' => $rank++,
            'name' => sanitize_text_field( $entry['name'] ?? '' ),
            'score' => (int) ( $entry['score'] ?? 0 ),
            'duration' => (int) ( $entry['duration'] ?? 0 ),
            'kills' => (int) ( $entry['kills'] ?? 0 ),
            'bosses' => (int) ( $entry['bosses'] ?? 0 ),
            'chests' => (int) ( $entry['chests'] ?? 0 ),
            'level' => (int) ( $entry['level'] ?? 1 ),
            'character' => sanitize_text_field( $entry['character'] ?? '' ),
            'date' => sanitize_text_field( $entry['date'] ?? '' ),
        ];
    }
    return rest_ensure_response( [ 'ok' => true, 'period' => $period, 'entries' => $entries ] );
}

function uacsswp_profile( WP_REST_Request $request ) {
    $name = sanitize_text_field( (string) $request->get_param( 'name' ) );
    $player_key = uacsswp_validate_player_key( $request->get_param( 'player_key' ) );
    if ( ! $player_key && $name === '' ) return uacsswp_error( 'Oyuncu kimliği veya isim gerekli.', 'identity_required', 400 );
    $owner_hash = $player_key ? hash( 'sha256', $player_key . wp_salt( 'auth' ) ) : hash( 'sha256', $name . wp_salt( 'auth' ) );
    $profile = get_option( uacsswp_profile_key( $owner_hash ), null );
    if ( ! is_array( $profile ) ) return rest_ensure_response( [ 'ok' => true, 'found' => false ] );
    return rest_ensure_response( [
        'ok' => true,
        'found' => true,
        'profile' => [
            'name' => sanitize_text_field( $profile['name'] ?? $name ),
            'base_name' => sanitize_text_field( $profile['base_name'] ?? '' ),
            'games' => (int) ( $profile['games'] ?? 0 ),
            'best_score' => (int) ( $profile['best_score'] ?? 0 ),
            'best_duration' => (int) ( $profile['best_duration'] ?? 0 ),
            'total_kills' => (int) ( $profile['total_kills'] ?? 0 ),
            'total_bosses' => (int) ( $profile['total_bosses'] ?? 0 ),
            'total_chests' => (int) ( $profile['total_chests'] ?? 0 ),
            'achievement_count' => is_array( $profile['achievements'] ?? null ) ? count( $profile['achievements'] ) : 0,
        ],
    ] );
}

function uacsswp_register_assets() {
    wp_register_style( 'uac-son-siginak-wp', UACSSWP_URL . 'assets/css/uac-son-siginak-wp.css', [], UACSSWP_VERSION );
    wp_register_script( 'uac-son-siginak-wp', UACSSWP_URL . 'assets/js/uac-son-siginak-wp.js', [], UACSSWP_VERSION, true );
}
add_action( 'wp_enqueue_scripts', 'uacsswp_register_assets' );

function uacsswp_enqueue_assets() {
    wp_enqueue_style( 'uac-son-siginak-wp' );
    wp_enqueue_script( 'uac-son-siginak-wp' );
    wp_localize_script( 'uac-son-siginak-wp', 'UACSSWP_DATA', [
        'rest' => esc_url_raw( rest_url( 'uac-son-siginak/wp' ) ),
        'assetBase' => esc_url_raw( UACSSWP_URL . 'assets/' ),
        'version' => UACSSWP_VERSION,
        'identityCookie' => 'uacsswp_player_key',
    ] );
}

function uacsswp_shortcode() {
    uacsswp_enqueue_assets();
    ob_start();
    ?>
    <section class="uacss5-page" aria-labelledby="uacss5-title">
      <header class="uacss5-hero">
        <p class="uacss5-eyebrow">2D açık dünya hayatta kalma</p>
        <h1 id="uacss5-title">Son Sığınak</h1>
        <p>Açık dünyada dolaş, binalara gir, sandıklardan silah ve destek ekipmanı topla, boss dalgalarına dayan ve liderlik tablosunda yerini al. Sarı/yeşil uyarı alanları boss saldırısıdır; alanda durma.</p>
      </header>

      <div class="uacss5-shell" id="uacss5-shell">
        <canvas id="uacss5-canvas" width="1280" height="720" aria-label="Son Sığınak oyun alanı"></canvas>
        <div class="uacss5-hud" id="uacss5-hud" aria-live="polite">
          <div class="wide"><span>CAN</span><b id="uacss5-hp">100/100</b><i><em id="uacss5-hpbar"></em></i></div>
          <div><span>SKOR</span><b id="uacss5-score">0</b></div>
          <div><span>SÜRE</span><b id="uacss5-time">00:00</b></div>
          <div><span>BOSS</span><b id="uacss5-boss-time">01:20</b></div>
          <div><span>DÜŞMAN</span><b id="uacss5-kills">0</b></div>
          <div><span>BOSS KILL</span><b id="uacss5-bosses">0</b></div>
          <div><span>SANDIK</span><b id="uacss5-chests">0</b></div>
          <div><span>LVL</span><b id="uacss5-level">1</b></div>
          <div class="wide"><span>EKİPMAN</span><b id="uacss5-weapon">Pulse</b></div>
        </div>
        <button class="uacss5-sound" id="uacss5-sound" type="button" aria-label="Sesi aç veya kapat">SES: AÇIK</button>
        <div class="uacss5-toast" id="uacss5-toast"></div>
        <div class="uacss5-hint" id="uacss5-hint">E / Dokun: Etkileşim</div>
        <div class="uacss5-task" id="uacss5-task"><span>GÖREV</span><b>Hazırlanıyor...</b></div>
        <div class="uacss5-rotate" id="uacss5-rotate">Telefonu yatay çevirmen veya tam ekran açman önerilir.</div>
        <div class="uacss5-mobile-stick" id="uacss5-stick" aria-hidden="true"><i></i></div>
        <button class="uacss5-action" id="uacss5-action" type="button" aria-label="Etkileşim">E</button>
        <button class="uacss5-tactical" id="uacss5-tactical" type="button" aria-label="Mayın veya el bombası kullan">F</button>
        <button class="uacss5-fullscreen" id="uacss5-fullscreen" type="button" aria-label="Tam ekran">⛶</button>

        <div class="uacss5-overlay" id="uacss5-start">
          <h2>Son Sığınak</h2>
          <p>Haritada hayatta kal, binaları keşfet, sandıklardan yeni silahlar bul, drone desteği kur ve boss dalgalarına dayan.</p>
          <div class="uacss5-profile" id="uacss5-profile">Profil hazırlanıyor...</div>
          <button class="uacss5-perf" id="uacss5-perf" type="button">PERFORMANS: KAPALI</button>
          <input id="uacss5-name" maxlength="20" autocomplete="off" autocorrect="off" autocapitalize="off" inputmode="text" spellcheck="false" placeholder="Oyuncu adın">
          <div class="uacss5-class-grid" role="radiogroup" aria-label="Karakter seçimi">
            <button type="button" class="active" data-class="survivor">Hayatta Kalan<br><small>Dengeli + hasar</small></button>
            <button type="button" data-class="scout">Gezgin<br><small>Çok hızlı, az can</small></button>
            <button type="button" data-class="engineer">Mühendis<br><small>Loot/sandık avantajı</small></button>
            <button type="button" data-class="medic">Sıhhiyeci<br><small>İyileşme güçlü</small></button>
          </div>
          <button class="uacss5-primary" type="button" id="uacss5-start-btn">OYUNA BAŞLA</button>
          <p class="uacss5-keys">PC: WASD/Yön tuşları + E, F ile mayın/el bombası. Mobil: Sol joystick + E butonu + F taktik butonu. Telefonlarda tam ekran önerilir.</p>
        </div>

        <div class="uacss5-overlay" id="uacss5-gameover" hidden>
          <h2>Oyun Bitti</h2>
          <div id="uacss5-result" class="uacss5-result"></div>
          <div class="uacss5-tabs"><button data-period="all" class="active">GENEL</button><button data-period="week">HAFTA</button><button data-period="day">BUGÜN</button></div>
          <div id="uacss5-leaderboard" class="uacss5-leaderboard"></div>
          <button class="uacss5-primary" type="button" id="uacss5-restart">YENİDEN BAŞLAT</button>
        </div>
      </div>

      <section class="uacss5-info">
        <h2>Nasıl oynanır?</h2>
        <p>Canını koru, düşmanları temizle, binalara kapıdan gir, iç mekân sandıklarını topla ve boss zamanlayıcısına dikkat et. Sandıklardan SMG, minigun, keskin nişancı, plazma topu, buz ışını, alev püskürtücü, mayın paketi, el bombası, zırh, kask, çanta ve sınırlı sayıda drone çıkabilir. Silahlar seviye atlar ve evrilir; minigun daha zor seviye alır ama her seviyede daha sert güçlenir. Drone sınırı 4’tür, bina türleri farklı loot verir, görevler ekstra ödül sağlar. Mobilde en iyi deneyim için yatay ekran veya tam ekran önerilir. Skor; süre, düşman, boss, sandık ve seviye bilgisine göre hesaplanır.</p>
      </section>
      <noscript>Bu oyunu oynamak için tarayıcında JavaScript açık olmalıdır.</noscript>
    </section>
    <?php
    return ob_get_clean();
}

function uacsswp_register_shortcodes() {
    
    add_shortcode( 'uac_son_siginak', 'uacsswp_shortcode' );
    add_shortcode( 'uac_son_siginak_wp', 'uacsswp_shortcode' );
    add_shortcode( 'uac_son_siginak_v5', 'uacsswp_shortcode' );
    add_shortcode( 'son_siginak', 'uacsswp_shortcode' );
    add_shortcode( 'son_siginak_wp', 'uacsswp_shortcode' );
    add_shortcode( 'uacsswp', 'uacsswp_shortcode' );
}
add_action( 'plugins_loaded', 'uacsswp_register_shortcodes', 999 );
add_action( 'init', 'uacsswp_register_shortcodes', 999 );
uacsswp_register_shortcodes();

function uacsswp_force_shortcode_fallback( $content ) {
    if ( is_admin() || ! is_string( $content ) ) return $content;
    $tags = [
        '[uac_son_siginak]', '[uac_son_siginak_wp]', '[uac_son_siginak_v5]', '[son_siginak]', '[son_siginak_wp]', '[uacsswp]', '[uacss5]',
        '&#91;uac_son_siginak&#93;', '&#91;uac_son_siginak_wp&#93;', '&#91;uac_son_siginak_v5&#93;', '&#91;son_siginak&#93;', '&#91;son_siginak_wp&#93;', '&#91;uacsswp&#93;', '&#91;uacss5&#93;'
    ];
    foreach ( $tags as $tag ) {
        if ( strpos( $content, $tag ) !== false ) {
            $content = str_replace( $tag, uacsswp_shortcode(), $content );
        }
    }
    return $content;
}
add_filter( 'the_content', 'do_shortcode', 11 );
add_filter( 'the_content', 'uacsswp_force_shortcode_fallback', 99 );
add_filter( 'widget_text', 'do_shortcode', 11 );
add_filter( 'widget_text_content', 'do_shortcode', 11 );
