<?php
/**
 * mail.php – Verarbeitung des Kontaktformulars für x@motion
 *
 * Nimmt die POST-Daten aus kontakt/index.html entgegen, prüft sie,
 * und verschickt die Anfrage per PHP mail() an formulare@xatmotion.de.
 * Läuft mit den Bordmitteln des Webspace (kein externer Dienst nötig) –
 * Voraussetzung ist ein Hosting mit aktivierter PHP mail()-Funktion
 * (z. B. der bestehende All-Inkl-Webspace).
 *
 * Hinweis: Die Absenderadresse im "From"-Header sollte zur eigenen
 * Domain gehören (siehe $absender unten), damit E-Mail-Anbieter die
 * Nachricht nicht als Spam einstufen. Bitte ggf. auf eine echte,
 * bei All-Inkl eingerichtete Postfach-Adresse anpassen.
 */

$empfaenger = 'formulare@xatmotion.de';
$absender   = 'webseite@xatmotion.de'; // Absender der internen Benachrichtigung
$antwortAdresse = 'info@xatmotion.de'; // Absender der Bestätigungsmail an den Anfragenden

// Weihnachtspause (in js/pause.js ebenfalls pflegen): Hinweis in der Bestätigung 14 Tage vorher bis Ende
$pauseVon = '2026-12-11';
$pauseBis = '2027-01-03';
$pauseWieder = '4. Januar 2027';

$isAjax = (!empty($_SERVER['HTTP_X_REQUESTED_WITH'])
    && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest');

function respond($success, $message, $isAjax) {
    if ($isAjax) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => $success, 'message' => $message]);
        exit;
    }
    header($success ? 'Location: danke/index.html' : 'Location: index.html?status=error#kontaktformular');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond(false, 'Ungültige Anfrage.', $isAjax);
}

// Honeypot-Feld (unsichtbar für Menschen, wird nur von Bots ausgefüllt)
if (!empty($_POST['notiz_intern'])) {
    // Bot: so tun als sei alles gut gelaufen, aber nichts verschicken
    respond(true, 'Vielen Dank für Ihre Nachricht!', $isAjax);
}

// Zeit-Falle: Formular wurde beim Laden mit einem Zeitstempel versehen (siehe js/main.js).
// Bots senden das Formular meist innerhalb von Sekundenbruchteilen ab, echte Nutzer brauchen länger.
$formTs = $_POST['form_ts'] ?? '';
if ($formTs === '' || !is_numeric($formTs)) {
    // Kein Zeitstempel vorhanden -> Anfrage kam nicht über das echte Formular
    respond(true, 'Vielen Dank für Ihre Nachricht!', $isAjax);
}
$sekundenSeitLaden = (microtime(true) * 1000 - (float) $formTs) / 1000;
if ($sekundenSeitLaden < 3) {
    // Zu schnell abgeschickt, um von einem Menschen ausgefüllt worden zu sein
    respond(true, 'Vielen Dank für Ihre Nachricht!', $isAjax);
}

// Begrenzung pro Absender: höchstens 5 Anfragen pro Stunde (gehashte IP, nur kurz im temporären Verzeichnis)
$rlDatei = sys_get_temp_dir() . '/xatmotion_form_rl.json';
$rlKey   = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . date('Y-m-d') . '|xatmotion');
$rlDaten = [];
if (is_file($rlDatei)) {
    $rlDaten = json_decode((string) @file_get_contents($rlDatei), true) ?: [];
}
$jetzt = time();
foreach ($rlDaten as $k => $zeiten) {
    $rlDaten[$k] = array_values(array_filter($zeiten, function ($t) use ($jetzt) { return $t > $jetzt - 3600; }));
    if (empty($rlDaten[$k])) unset($rlDaten[$k]);
}
if (count($rlDaten[$rlKey] ?? []) >= 5) {
    respond(false, 'Es wurden zu viele Anfragen in kurzer Zeit gesendet. Bitte versuchen Sie es später erneut oder schreiben Sie uns direkt an formulare@xatmotion.de.', $isAjax);
}
$rlDaten[$rlKey][] = $jetzt;
@file_put_contents($rlDatei, json_encode($rlDaten), LOCK_EX);

$vorname   = trim($_POST['vorname']   ?? '');
$nachname  = trim($_POST['nachname']  ?? '');
$email     = trim($_POST['email']     ?? '');
$telefon   = trim($_POST['telefon']   ?? '');
$leistung  = trim($_POST['leistung']  ?? '');
$termin    = trim($_POST['termin']    ?? '');
$paket     = strtoupper(trim($_POST['paket'] ?? ''));
if (!in_array($paket, ['S', 'M', 'L', 'XL'], true)) $paket = ''; // nur bekannte Werte
$nachricht = trim($_POST['nachricht'] ?? '');
$dsgvo     = isset($_POST['dsgvo']);

$fehler = [];
if ($vorname === '')  $fehler[] = 'Vorname fehlt.';
if ($nachname === '') $fehler[] = 'Nachname fehlt.';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $fehler[] = 'Gültige E-Mail-Adresse fehlt.';
if ($nachricht === '') $fehler[] = 'Nachricht fehlt.';
if (!$dsgvo) $fehler[] = 'Bitte stimmen Sie der Datenschutzerklärung zu.';

if (!empty($fehler)) {
    respond(false, implode(' ', $fehler), $isAjax);
}

// Inhaltsfilter gegen typischen Formular-Spam (Linktausch-/SEO-Anfragen, Massen-Mailings).
// Echte Kundenanfragen enthalten so gut wie nie Links oder diese Formulierungen.
$spamMuster = [
    'http://', 'https://', 'www.',
    'seo', 'backlink', 'guest post', 'link exchange', 'link building',
    'domain rating', 'dr30', 'dr 30', 'monthly traffic',
    'unsubscribe', 'no longer want to receive', 'delist',
    'collab idea',
];
$pruefText = mb_strtolower($nachricht . ' ' . $vorname . ' ' . $nachname);
foreach ($spamMuster as $muster) {
    if (mb_strpos($pruefText, $muster) !== false) {
        // Sieht nach Spam aus: so tun als sei alles gut gelaufen, aber nichts verschicken
        respond(true, 'Vielen Dank für Ihre Nachricht!', $isAjax);
    }
}

// Header-Injection verhindern
$clean = function ($value) {
    return str_replace(["\r", "\n"], '', $value);
};
$vorname  = $clean($vorname);
$nachname = $clean($nachname);
$email    = $clean($email);
$telefon  = $clean($telefon);
$leistung = $clean($leistung);
$termin   = $clean($termin);

$betreff = 'Neue Kontaktanfrage über die Website' . ($paket !== '' ? ' (Paket ' . $paket . ')' : '') . ' – ' . $vorname . ' ' . $nachname;

$body  = "Neue Anfrage über das Kontaktformular auf xatmotion.de\n\n";
$body .= "Vorname:             $vorname\n";
$body .= "Nachname:            $nachname\n";
$body .= "E-Mail:              $email\n";
$body .= "Telefon:             " . ($telefon !== '' ? $telefon : '–') . "\n";
$body .= "Angefragte Leistung: " . ($leistung !== '' ? $leistung : '–') . "\n";
$body .= "Gewünschtes Paket:  " . ($paket !== '' ? 'Paket ' . $paket : '–') . "\n";
$body .= "Termin/Zeitraum:    " . ($termin !== '' ? $termin : '–') . "\n\n";
$body .= "Nachricht:\n$nachricht\n";

$headers   = [];
$headers[] = 'From: Website Kontaktformular <' . $absender . '>';
$headers[] = 'Reply-To: ' . $vorname . ' ' . $nachname . ' <' . $email . '>';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';

$erfolg = @mail(
    $empfaenger,
    '=?UTF-8?B?' . base64_encode($betreff) . '?=',
    $body,
    implode("\r\n", $headers)
);

if ($erfolg) {
    // Bestätigungsmail an den Anfragenden (ohne seinen Freitext, damit das Formular nicht als Spam-Schleuder taugt)
    $sendeBestaetigung = true;

    // 1) Nur harmlose Kurzangaben zurückspiegeln: keine Links/Adressen, begrenzte Länge
    $kurz = function ($t) {
        $t = trim(preg_replace('/\s+/u', ' ', $t));
        if ($t === '' || preg_match('~https?:|www\.|@|\.(com|de|net|org|ru|cn|info|xyz)\b~iu', $t)) return '';
        return mb_substr($t, 0, 60);
    };
    $leistungMail = $kurz($leistung);
    $terminMail   = $kurz($termin);

    // 2) Anrede nur aus Buchstaben/Leerzeichen/Bindestrich, sonst neutral
    $vornameMail = trim(mb_substr(preg_replace('/[^\p{L} \-\']/u', '', $vorname), 0, 40));

    // 3) Begrenzung: je Empfänger nur 1 Bestätigung pro 24 h, insgesamt höchstens 40 pro Stunde
    $cfDatei = sys_get_temp_dir() . '/xatmotion_form_conf.json';
    $cf = is_file($cfDatei) ? (json_decode((string) @file_get_contents($cfDatei), true) ?: []) : [];
    $nowTs = time();
    $cf = array_filter($cf, function ($t) use ($nowTs) { return $t > $nowTs - 86400; });
    $empfKey = hash('sha256', mb_strtolower($email) . '|xatmotion-conf');
    $letzteStunde = count(array_filter($cf, function ($t) use ($nowTs) { return $t > $nowTs - 3600; }));
    if (isset($cf[$empfKey]) || $letzteStunde >= 40) {
        $sendeBestaetigung = false;
    } else {
        $cf[$empfKey] = $nowTs;
    }
    @file_put_contents($cfDatei, json_encode($cf), LOCK_EX);

    if ($sendeBestaetigung) {
    $anrede = trim(str_replace(['<', '>', '"', ',', ';'], '', $vorname . ' ' . $nachname));
    $heute  = date('Y-m-d');
    $pauseHinweis = '';
    if ($heute >= date('Y-m-d', strtotime($pauseVon . ' -14 days')) && $heute <= $pauseBis) {
        $pauseHinweis = "Hinweis: Vom " . date('d.m.Y', strtotime($pauseVon)) . " bis " . date('d.m.Y', strtotime($pauseBis))
            . " macht x@motion Weihnachtspause. Anfragen aus dieser Zeit beantworte ich ab dem $pauseWieder.\n\n";
    }
    $bestaetigung  = ($vornameMail !== '' ? "Hallo $vornameMail,\n\n" : "Hallo,\n\n");
    $bestaetigung .= "vielen Dank für Ihre Anfrage – sie ist bei mir angekommen.\n";
    $bestaetigung .= "Ich melde mich in der Regel innerhalb von 48 Stunden persönlich bei Ihnen.\n\n";
    $bestaetigung .= $pauseHinweis;
    $bestaetigung .= "Ihre Angaben im Überblick:\n";
    $bestaetigung .= "Angefragte Leistung: " . ($leistungMail !== '' ? $leistungMail : '–') . "\n";
    if ($paket !== '') $bestaetigung .= "Gewünschtes Paket:  Paket $paket\n";
    $bestaetigung .= "Termin/Zeitraum:    " . ($terminMail !== '' ? $terminMail : '–') . "\n\n";
    $bestaetigung .= "So geht es weiter:\n";
    $bestaetigung .= "1. Ich lese Ihre Anfrage und melde mich per E-Mail oder Telefon.\n";
    $bestaetigung .= "2. Wir besprechen kurz Ziel, Termin und Umfang – unverbindlich.\n";
    $bestaetigung .= "3. Sie erhalten ein klar aufgebautes Angebot.\n\n";
    $bestaetigung .= "Wenn es eilt: 03623 / 3199065\n\n";
    $bestaetigung .= "Diese Nachricht wurde automatisch erstellt, weil Sie das Kontaktformular auf xatmotion.de genutzt haben. ";
    $bestaetigung .= "Sie können einfach darauf antworten.\n\n";
    $bestaetigung .= "Mit besten Grüßen\nSteffen Schmoock\n\nx@motion Medienproduktion\nLindenstraße 33, 99894 Friedrichroda\nhttps://www.xatmotion.de\n";

    $bh   = [];
    $bh[] = 'From: x@motion Medienproduktion <' . $antwortAdresse . '>';
    $bh[] = 'Reply-To: ' . $antwortAdresse;
    $bh[] = 'Auto-Submitted: auto-replied';
    $bh[] = 'Content-Type: text/plain; charset=UTF-8';
    @mail($email, '=?UTF-8?B?' . base64_encode('Ihre Anfrage bei x@motion – danke!') . '?=', $bestaetigung, implode("\r\n", $bh));
    }

    respond(true, 'Vielen Dank für Ihre Nachricht! Wir melden uns in der Regel innerhalb von 48 Stunden bei Ihnen.', $isAjax);
} else {
    respond(false, 'Beim Versand ist leider ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder schreiben Sie uns direkt an formulare@xatmotion.de.', $isAjax);
}
