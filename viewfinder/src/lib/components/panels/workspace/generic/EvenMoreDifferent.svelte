<script>
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
</script>

<div id="viz-test_container">
	The current timezone is
	<a
		aria-label="timezone"
		target="_blank"
		href="https://www.zeitverschiebung.net/en/timezone/{tz.toLowerCase().split('/')[0]}--{tz.toLowerCase().split('/')[1]}"
	>
		<strong>{Intl.DateTimeFormat().resolvedOptions().timeZone}</strong>
	</a>
</div>
